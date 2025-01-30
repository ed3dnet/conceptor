import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { type Readable } from "node:stream";

import { type Logger } from "pino";
import sharp from "sharp";
import { WebPInfo } from "webpinfo";

export async function optimizeAvif(
  logger: Logger,
  sourceStream: Readable,
): Promise<Readable> {
  return sourceStream.pipe(
    sharp().rotate().avif({
      quality: 85,
      effort: 9,
      chromaSubsampling: "4:4:4",
    }),
  );
}

export async function convertToAvif(
  logger: Logger,
  sourceStream: Readable,
  sourceMimeType: string,
): Promise<Readable> {
  if (sourceMimeType === "image/avif") {
    return optimizeAvif(logger, sourceStream);
  }

  const options = await (async () => {
    switch (sourceMimeType) {
      case "image/png":
        return {
          lossless: true,
          effort: 9,
          chromaSubsampling: "4:4:4",
        };
      case "image/webp": {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "avif-"));
        const inputPath = path.join(tempDir, "input.webp");

        try {
          await new Promise((resolve, reject) => {
            sourceStream
              .pipe(createWriteStream(inputPath))
              .on("finish", resolve)
              .on("error", reject);
          });

          const isLossless = await WebPInfo.isLossless(inputPath);

          return {
            lossless: isLossless,
            effort: 9,
            chromaSubsampling: "4:4:4",
            ...(!isLossless && { quality: 85 }),
          };
        } finally {
          process.nextTick(async () => {
            await fs.rm(tempDir, { recursive: true, force: true });
          });
        }
      }
      case "image/jpeg":
        return {
          quality: 85,
          effort: 9,
          chromaSubsampling: "4:4:4",
        };
      default:
        throw new Error(`Unsupported source mime type: ${sourceMimeType}`);
    }
  })();

  return sourceStream.pipe(sharp().rotate().avif(options));
}
