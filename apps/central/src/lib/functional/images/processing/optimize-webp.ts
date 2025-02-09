import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { type Readable } from "node:stream";

import { type Logger } from "pino";
import sharp from "sharp";
import { WebPInfo } from "webpinfo";

import { type ImageMimeType } from "./analyze.js";

export async function optimizeWebp(
  logger: Logger,
  sourceStream: Readable,
): Promise<Readable> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "webp-"));
  const inputPath = path.join(tempDir, "input.webp");

  try {
    // Write stream to temp file
    await new Promise((resolve, reject) => {
      sourceStream
        .pipe(createWriteStream(inputPath))
        .on("finish", resolve)
        .on("error", reject);
    });

    const info = await WebPInfo.from(inputPath);
    const isLossless = await WebPInfo.isLossless(inputPath);

    return sharp(inputPath)
      .rotate()
      .webp({
        lossless: isLossless,
        effort: 6,
        ...(isLossless ? {} : { quality: 85, nearLossless: false }),
      });
  } finally {
    process.nextTick(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });
  }
}

export async function convertToWebp(
  logger: Logger,
  sourceStream: Readable,
  sourceMimeType: ImageMimeType,
): Promise<Readable> {
  if (sourceMimeType === "image/webp") {
    return optimizeWebp(logger, sourceStream);
  }

  const options = await (async () => {
    let missed: never;
    switch (sourceMimeType) {
      case "image/png":
        return {
          lossless: true,
          effort: 6,
        };
      case "image/jpeg":
      case "image/avif":
        return {
          quality: 85,
          effort: 6,
          nearLossless: false,
        };
      default:
        missed = sourceMimeType;
        throw new Error(`Unsupported source mime type: ${sourceMimeType}`);
    }
  })();

  return sourceStream.pipe(sharp().rotate().webp(options));
}
