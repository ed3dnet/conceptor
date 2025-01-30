import { type Readable } from "node:stream";

import { type Logger } from "pino";
import sharp from "sharp";

const PNG_OPTIONS = {
  compressionLevel: 9,
} as const;

export async function optimizePng(
  logger: Logger,
  sourceStream: Readable,
): Promise<Readable> {
  // TODO: in the future, maybe determine if we can palettize low-color images
  return sourceStream.pipe(sharp().rotate().png(PNG_OPTIONS));
}

export async function convertToPng(
  logger: Logger,
  sourceStream: Readable,
): Promise<Readable> {
  return optimizePng(logger, sourceStream);
}
