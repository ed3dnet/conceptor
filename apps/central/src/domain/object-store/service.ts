import { Readable } from "node:stream";

import {
  Client,
  type ItemBucketMetadata,
  type CopyConditions,
  type ClientOptions,
} from "minio";
import { type Logger } from "pino";

import { type UrlsConfig } from "../../_config/types.js";

import {
  type S3Config,
  type S3BucketConfig,
  type S3BucketName,
  S3_PUBLIC_BUCKET_NAMES,
} from "./config.js";
import { type S3Locator } from "./types.js";

export type MinioClient = Client;
export type MinioCopyConditions = CopyConditions;

export function buildMinioClient(
  logger: Logger,
  s3Config: S3Config,
): MinioClient {
  logger = logger.child({ fn: buildMinioClient.name });

  const options = {
    endPoint: s3Config.endpoint.replace("http://", "").replace("https://", ""),
    port: s3Config.port,
    useSSL: s3Config.ssl,

    accessKey: s3Config.accessKey,
    secretKey: s3Config.secretKey,

    region: "local",
  } satisfies ClientOptions;

  const minioClient = new Client(options);

  return minioClient;
}

export class ObjectStoreService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    public readonly minio: MinioClient,

    private readonly fetch: typeof global.fetch,
    private readonly urls: UrlsConfig,
    private readonly buckets: S3BucketConfig,
  ) {
    this.logger = logger.child({ context: ObjectStoreService.name });
  }

  bucketName(bucket: S3BucketName): string {
    return this.buckets[bucket];
  }

  async webUrl(bucket: S3BucketName, path: string): Promise<string> {
    try {
      if (S3_PUBLIC_BUCKET_NAMES.includes(bucket)) {
        return [this.urls.s3ExternalUrl, this.bucketName(bucket), path].join(
          "/",
        );
      }

      return this.createPresignedGetUrl({
        bucket,
        objectName: path,
      });
    } catch (error) {
      this.logger.error(
        { error, fn: this.webUrl.name },
        "Failed to get web URL for S3 object",
      );

      throw error;
    }
  }

  async createPresignedPutUrl(args: {
    bucket: S3BucketName;
    objectName: string;
  }): Promise<string> {
    return this.minio.presignedPutObject(
      this.bucketName(args.bucket),
      args.objectName,
      300,
    );
  }

  async createPresignedGetUrl(args: {
    bucket: S3BucketName;
    objectName: string;
    expiresIn?: number;
  }): Promise<string> {
    return this.minio.presignedGetObject(
      this.bucketName(args.bucket),
      args.objectName,
      args.expiresIn ?? 3600,
    );
  }

  // ------------ MINIO CLIENT WRAPPERS ------------

  async fGetObject(args: {
    bucket: S3BucketName;
    objectName: string;
    filePath: string;
  }) {
    return this.minio.fGetObject(
      this.bucketName(args.bucket),
      args.objectName,
      args.filePath,
    );
  }

  async getObject(args: { bucket: S3BucketName; objectName: string }) {
    return this.minio.getObject(this.bucketName(args.bucket), args.objectName);
  }

  async removeObject(args: { bucket: S3BucketName; objectName: string }) {
    return this.minio.removeObject(
      this.bucketName(args.bucket),
      args.objectName,
    );
  }

  async removeObjects(args: { bucket: S3BucketName; objectsList: string[] }) {
    return this.minio.removeObjects(
      this.bucketName(args.bucket),
      args.objectsList,
    );
  }

  async statObject(args: { bucket: S3BucketName; objectName: string }) {
    return this.minio.statObject(this.bucketName(args.bucket), args.objectName);
  }

  async listObjectsV2(args: {
    bucket: S3BucketName;
    prefix?: string | undefined;
    recursive?: boolean | undefined;
    startAfter?: string | undefined;
  }) {
    return this.minio.listObjectsV2(
      this.bucketName(args.bucket),
      args.prefix,
      args.recursive,
      args.startAfter,
    );
  }

  async fPutObject(args: {
    bucket: S3BucketName;
    objectName: string;
    filePath: string;
    metaData: ItemBucketMetadata;
  }) {
    return this.minio.fPutObject(
      this.bucketName(args.bucket),
      args.objectName,
      args.filePath,
      args.metaData,
    );
  }

  async putObject(args: {
    bucket: S3BucketName;
    objectName: string;
    stream: string | Buffer | Readable;
    size?: number;
    metaData?: ItemBucketMetadata;
  }) {
    return this.minio.putObject(
      this.bucketName(args.bucket),
      args.objectName,
      args.stream,
      args.size,
      args.metaData,
    );
  }

  /**
   * We can use S3 as a backing store for larger, intermittently created pieces of text.
   * @param locator the S3 locator for the cache
   * @param fn a function to provide the data to be cached. This function can return a string or a readable stream.
   * @returns the resultant object, whether cached or fresh, as a readable stream
   */
  async ensureObject(
    locator: S3Locator,
    fn: () => Promise<string | Readable>,
  ): Promise<{ stream: Readable; isFromCache: boolean }> {
    const logger = this.logger.child({ fn: this.ensureObject.name });
    // check s3 for the file; if it exists, return it
    try {
      const object = await this.getObject(locator);
      logger.info(`Cache hit for ${locator}`);
      return { stream: object, isFromCache: true };
    } catch (err) {
      logger.info(`Cache miss for ${locator}`);
    }

    // if it doesn't exist, generate it
    const result = await fn();
    let stream: Readable;
    let size: number | undefined;
    if (typeof result === "string") {
      // the function has generated a string, so we can generate it in its entirety
      stream = Readable.from(result);
      size = Buffer.byteLength(result);
    } else {
      // the function has generated a readable stream, so we can use it as is
      stream = result;
      size = undefined; // unknown size, because we don't know how long it will be
    }
    await this.putObject({ ...locator, stream, size });
    return { stream, isFromCache: false };
  }
}
