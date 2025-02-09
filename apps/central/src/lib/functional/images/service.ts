import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ResourceNotFoundError,
  ForbiddenError,
  InternalServerError,
} from "@myapp/shared-universal/errors/index.js";
import { eq, sql } from "drizzle-orm";
import { type Logger } from "pino";

import { type UrlsConfig } from "../../../_config/types.js";
import { type DBImage } from "../../../_db/models.js";
import { IMAGE_UPLOADS, IMAGES } from "../../../_db/schema/index.js";
import {
  type DrizzleRO,
  type Drizzle,
} from "../../datastores/postgres/types.server.js";
import { type S3BucketName } from "../object-store/config.js";
import { type ObjectStoreService } from "../object-store/service.js";
import { type TemporalDispatcher } from "../temporal-dispatcher/index.js";
import { type VaultService } from "../vault/service.js";

import { analyzeImage, type ImageAnalysis } from "./processing/analyze.js";
import { computeBlurHash } from "./processing/blurhash.js";
import { convertToAvif, optimizeAvif } from "./processing/optimize-avif.js";
import { convertToJpeg, optimizeJpeg } from "./processing/optimize-jpeg.js";
import { optimizePng } from "./processing/optimize-png.js";
import { convertToWebp, optimizeWebp } from "./processing/optimize-webp.js";
import { type ImageLinkSet, type ImageUsage } from "./schemas.js";
import { processImageWorkflow } from "./workflows/process-image.js";

export class ImagesService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly urls: UrlsConfig,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly temporalDispatch: TemporalDispatcher,
    private readonly objectStore: ObjectStoreService,
    private readonly vault: VaultService,
  ) {
    this.logger = logger.child({ context: this.constructor.name });
  }

  async getImageById(imageId: string): Promise<DBImage | null> {
    const [image] = await this.dbRO
      .select()
      .from(IMAGES)
      .where(eq(IMAGES.imageId, imageId))
      .limit(1);

    return image ?? null;
  }

  async getImageLinkSetById(
    imageId: string,
    executor?: DrizzleRO,
  ): Promise<ImageLinkSet | null> {
    executor = executor ?? this.dbRO;

    const [image] = await executor
      .select()
      .from(IMAGES)
      .where(eq(IMAGES.imageId, imageId))
      .limit(1);

    if (!image) {
      return null;
    }

    const fallbackAwaiter: Promise<string> = this.objectStore.webUrl(
      image.bucket,
      image.path,
    );
    const webpAwaiter: Promise<string> | undefined =
      image.readyRenditions.includes("image/webp")
        ? this.objectStore.webUrl(image.bucket, `${image.path}.webp`)
        : undefined;
    const avifAwaiter: Promise<string> | undefined =
      image.readyRenditions.includes("image/avif")
        ? this.objectStore.webUrl(image.bucket, `${image.path}.avif`)
        : undefined;

    const ret: ImageLinkSet = {
      fallback: await fallbackAwaiter,
      blurhash: image.blurhash ?? undefined,
      renditions: {
        "image/webp": webpAwaiter ? await webpAwaiter : undefined,
        "image/avif": avifAwaiter ? await avifAwaiter : undefined,
      },
    };

    return ret;
  }

  async createUploadUrl(
    tenantId: string,
    usage: ImageUsage,
  ): Promise<{
    uploadUrl: string;
    imageUploadId: string;
  }> {
    const logger = this.logger.child({
      fn: this.createUploadUrl.name,
      tenantId,
      usage,
    });
    const stagingObjectName = `staging/${usage}/${crypto.randomUUID()}`;

    logger.debug("Attempting to create upload URL.");

    const [upload] = await this.db
      .insert(IMAGE_UPLOADS)
      .values({
        tenantId,
        usage,
        stagingObjectName,
        targetBucket: "user-public-content",
        targetPath: `${tenantId}/${usage}/${crypto.randomUUID()}`,
      })
      .returning();

    const uploadUrl = await this.objectStore.createPresignedPutUrl({
      bucket: "upload-staging",
      objectName: stagingObjectName,
    });

    if (!upload) {
      throw new InternalServerError("Failed to create image upload");
    }

    logger.info(
      { imageUploadId: upload.imageUploadId },
      "Created image upload.",
    );

    return {
      uploadUrl,
      imageUploadId: upload.imageUploadId,
    };
  }

  async completeUpload(
    tenantId: string,
    imageUploadId: string,
  ): Promise<{ imageId: string }> {
    const [upload] = await this.db
      .select()
      .from(IMAGE_UPLOADS)
      .where(eq(IMAGE_UPLOADS.imageUploadId, imageUploadId))
      .limit(1);

    if (!upload) {
      throw new ResourceNotFoundError(
        "image upload",
        "imageUploadId",
        imageUploadId,
      );
    }

    if (upload.tenantId !== tenantId) {
      throw new ForbiddenError("Wrong tenant for upload");
    }

    const [image] = await this.db
      .insert(IMAGES)
      .values({
        tenantId,
        usage: upload.usage,
        bucket: upload.targetBucket,
        path: upload.targetPath,
        readyRenditions: [],
      })
      .returning();

    if (!image) {
      throw new InternalServerError("Failed to create image");
    }

    await this.temporalDispatch.startMedia(processImageWorkflow, [
      {
        imageId: image.imageId,
        sourceBucket: "upload-staging",
        sourceObject: upload.stagingObjectName,
        targetBucket: image.bucket,
        targetPath: image.path,
      },
    ]);

    return { imageId: image.imageId };
  }

  async deleteUpload(imageUploadId: string): Promise<void> {
    const logger = this.logger.child({
      fn: this.deleteUpload.name,
      imageUploadId,
    });

    const [upload] = await this.db
      .select()
      .from(IMAGE_UPLOADS)
      .where(eq(IMAGE_UPLOADS.imageUploadId, imageUploadId))
      .limit(1);

    if (!upload) {
      logger.warn("Upload not found for deletion");
      return;
    }

    // Delete staged file
    await this.objectStore.removeObject({
      bucket: "upload-staging",
      objectName: upload.stagingObjectName,
    });

    // Delete from database
    await this.db
      .delete(IMAGE_UPLOADS)
      .where(eq(IMAGE_UPLOADS.imageUploadId, imageUploadId));

    logger.info("Upload deleted successfully");
  }

  async deleteImage(imageId: string): Promise<void> {
    const logger = this.logger.child({ fn: this.deleteImage.name, imageId });
    logger.info("Attempting to delete image");

    const image = await this.getImageById(imageId);
    if (!image) {
      logger.warn("Image not found for deletion");
      return;
    }

    // Delete all renditions
    const deletePromises = [
      // Original
      this.objectStore.removeObject({
        bucket: image.bucket,
        objectName: image.path,
      }),
      // WebP rendition if it exists
      image.readyRenditions.includes("image/webp") &&
        this.objectStore.removeObject({
          bucket: image.bucket,
          objectName: `${image.path}.webp`,
        }),
      // AVIF rendition if it exists
      image.readyRenditions.includes("image/avif") &&
        this.objectStore.removeObject({
          bucket: image.bucket,
          objectName: `${image.path}.avif`,
        }),
    ].filter(Boolean);

    await Promise.all(deletePromises);

    // Delete database record
    await this.db.delete(IMAGES).where(eq(IMAGES.imageId, imageId));

    logger.info("Image and all renditions deleted successfully");
  }

  async analyzeImage(
    imageId: string,
    sourceBucket: S3BucketName,
    sourceObject: string,
  ): Promise<{
    analysis: ImageAnalysis;
    blurhash: string;
  }> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "analyze-"));
    const tempFile = path.join(tempDir, "source");

    try {
      const sourceStream = await this.objectStore.getObject({
        bucket: sourceBucket,
        objectName: sourceObject,
      });

      await new Promise((resolve, reject) => {
        sourceStream
          .pipe(createWriteStream(tempFile))
          .on("finish", resolve)
          .on("error", reject);
      });

      const [analysis, blurhash] = await Promise.all([
        analyzeImage(this.logger, tempFile),
        computeBlurHash(this.logger, createReadStream(tempFile)),
      ]);

      await this.db
        .update(IMAGES)
        .set({ blurhash })
        .where(eq(IMAGES.imageId, imageId));

      return {
        analysis,
        blurhash,
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  async optimizeOriginal(
    imageId: string,
    sourceBucket: S3BucketName,
    sourceObject: string,
    analysis: ImageAnalysis,
    targetBucket: S3BucketName,
    targetPath: string,
  ): Promise<void> {
    const logger = this.logger.child({
      fn: this.optimizeOriginal.name,
      imageId,
    });
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "optimize-"));
    const tempFile = path.join(tempDir, "source");

    try {
      const sourceStream = await this.objectStore.getObject({
        bucket: sourceBucket,
        objectName: sourceObject,
      });

      await new Promise((resolve, reject) => {
        sourceStream
          .pipe(createWriteStream(tempFile))
          .on("finish", resolve)
          .on("error", reject);
      });

      const optimizedStream = await (async () => {
        switch (analysis.mimeType) {
          case "image/jpeg":
            return optimizeJpeg(this.logger, createReadStream(tempFile));
          case "image/png":
            return optimizePng(this.logger, createReadStream(tempFile));
          case "image/webp":
            return optimizeWebp(this.logger, createReadStream(tempFile));
          case "image/avif":
            return optimizeAvif(this.logger, createReadStream(tempFile));
        }
      })();

      await this.objectStore.putObject({
        bucket: targetBucket,
        objectName: targetPath,
        stream: optimizedStream,
        metaData: {
          "Cache-Control": "public, max-age=3600",
          "Content-Type": analysis.mimeType,
          "Access-Control-Allow-Origin": "*",
        },
      });

      const renditionFormat =
        analysis.mimeType === "image/jpeg" || analysis.mimeType === "image/png"
          ? "fallback"
          : analysis.mimeType;

      await this.db
        .update(IMAGES)
        .set({
          readyRenditions: sql`array_append(${IMAGES.readyRenditions}, ${renditionFormat})`,
        })
        .where(eq(IMAGES.imageId, imageId));
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  async generateFallback(
    imageId: string,
    sourceBucket: S3BucketName,
    sourceObject: string,
    analysis: ImageAnalysis,
    targetBucket: S3BucketName,
    targetPath: string,
  ): Promise<void> {
    const logger = this.logger.child({
      fn: this.generateFallback.name,
      imageId,
    });
    const { mimeType } = analysis;
    if (mimeType === "image/jpeg" || mimeType === "image/png") {
      return;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fallback-"));
    const tempFile = path.join(tempDir, "source");

    try {
      const sourceStream = await this.objectStore.getObject({
        bucket: sourceBucket,
        objectName: sourceObject,
      });

      await new Promise((resolve, reject) => {
        sourceStream
          .pipe(createWriteStream(tempFile))
          .on("finish", resolve)
          .on("error", reject);
      });

      const fallbackStream = await convertToJpeg(
        this.logger,
        createReadStream(tempFile),
      );

      await this.objectStore.putObject({
        bucket: targetBucket,
        objectName: `${targetPath}.fallback`,
        stream: fallbackStream,
        metaData: {
          "Cache-Control": "public, max-age=3600",
          "Content-Type": "image/jpeg",
          "Access-Control-Allow-Origin": "*",
        },
      });

      await this.db
        .update(IMAGES)
        .set({
          readyRenditions: sql`array_append(${IMAGES.readyRenditions}, 'fallback')`,
        })
        .where(eq(IMAGES.imageId, imageId));
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  async generateWebP(
    imageId: string,
    sourceBucket: S3BucketName,
    sourceObject: string,
    analysis: ImageAnalysis,
    targetBucket: S3BucketName,
    targetPath: string,
  ): Promise<void> {
    const logger = this.logger.child({
      fn: this.generateWebP.name,
      imageId,
    });

    // Skip if source is already WebP
    if (analysis.mimeType === "image/webp") {
      return;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "webp-"));
    const tempFile = path.join(tempDir, "source");

    try {
      const sourceStream = await this.objectStore.getObject({
        bucket: sourceBucket,
        objectName: sourceObject,
      });

      await new Promise((resolve, reject) => {
        sourceStream
          .pipe(createWriteStream(tempFile))
          .on("finish", resolve)
          .on("error", reject);
      });

      const webpStream = await convertToWebp(
        this.logger,
        createReadStream(tempFile),
        analysis.mimeType,
      );

      await this.objectStore.putObject({
        bucket: targetBucket,
        objectName: `${targetPath}.webp`,
        stream: webpStream,
        metaData: {
          "Cache-Control": "public, max-age=3600",
          "Content-Type": "image/webp",
          "Access-Control-Allow-Origin": "*",
        },
      });

      await this.db
        .update(IMAGES)
        .set({
          readyRenditions: sql`array_append(${IMAGES.readyRenditions}, 'image/webp')`,
        })
        .where(eq(IMAGES.imageId, imageId));
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  async generateAVIF(
    imageId: string,
    sourceBucket: S3BucketName,
    sourceObject: string,
    analysis: ImageAnalysis,
    targetBucket: S3BucketName,
    targetPath: string,
  ): Promise<void> {
    const logger = this.logger.child({
      fn: this.generateAVIF.name,
      imageId,
    });

    // Skip if source is already AVIF
    if (analysis.mimeType === "image/avif") {
      return;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "avif-"));
    const tempFile = path.join(tempDir, "source");

    try {
      const sourceStream = await this.objectStore.getObject({
        bucket: sourceBucket,
        objectName: sourceObject,
      });

      await new Promise((resolve, reject) => {
        sourceStream
          .pipe(createWriteStream(tempFile))
          .on("finish", resolve)
          .on("error", reject);
      });

      const avifStream = await convertToAvif(
        this.logger,
        createReadStream(tempFile),
        analysis.mimeType,
      );

      logger.info("Stream converted to AVIF; uploading to S3.");

      const bucket = targetBucket;
      const objectName = `${targetPath}.avif`;
      await this.objectStore.putObject({
        bucket,
        objectName,
        stream: avifStream,
        metaData: {
          "Cache-Control": "public, max-age=3600",
          "Content-Type": "image/avif",
          "Access-Control-Allow-Origin": "*",
        },
      });

      logger.info({ bucket, objectName }, "AVIF uploaded to S3.");

      await this.db
        .update(IMAGES)
        .set({
          readyRenditions: sql`array_append(${IMAGES.readyRenditions}, 'image/avif')`,
        })
        .where(eq(IMAGES.imageId, imageId));
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}
