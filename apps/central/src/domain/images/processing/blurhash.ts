import { type Readable } from "node:stream";

import { encode } from "blurhash";
import { type Logger } from "pino";
import sharp from "sharp";

export async function computeBlurHash(
  logger: Logger,
  sourceStream: Readable,
): Promise<string> {
  const image = sharp();
  const pipeline = sourceStream.pipe(image);

  // Resize to smaller dimensions for blurhash computation
  const { data, info } = await pipeline
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });

  return encode(
    new Uint8ClampedArray(data.buffer),
    info.width,
    info.height,
    4, // x components
    3, // y components
  );
}
