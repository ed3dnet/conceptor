import { execFile } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { type Readable } from "node:stream";
import { promisify } from "node:util";

import mozjpeg from "mozjpeg";
import { type Logger } from "pino";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

const MOZJPEG_DEFAULT_ARGS = [
  "-optimize", // Optimize Huffman tables
  "-progressive", // Create progressive JPEG
  "-quality",
  "85", // Balance quality/size
  "-tune-ssim", // Tune for structural similarity
  "-dct",
  "int", // Integer DCT for best compatibility
  "-quant-table",
  "3", // Robidoux quantization table
] as const;

export async function optimizeJpeg(
  logger: Logger,
  sourceStream: Readable,
): Promise<Readable> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "jpeg-"));
  const inputPath = path.join(tempDir, "input.jpg");
  const outputPath = path.join(tempDir, "output.jpg");

  try {
    // Pipe through Sharp for rotation normalization
    await new Promise((resolve, reject) => {
      sourceStream
        .pipe(sharp().rotate().jpeg())
        .pipe(createWriteStream(inputPath))
        .on("finish", resolve)
        .on("error", reject);
    });

    await execFileAsync(mozjpeg, [
      ...MOZJPEG_DEFAULT_ARGS,
      "-outfile",
      outputPath,
      inputPath,
    ]);

    return createReadStream(outputPath);
  } finally {
    // Cleanup happens after stream is consumed
    process.nextTick(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });
  }
}

export async function convertToJpeg(
  logger: Logger,
  sourceStream: Readable,
): Promise<Readable> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "jpeg-convert-"));
  const inputPath = path.join(tempDir, "input.jpg");
  const outputPath = path.join(tempDir, "output.jpg");

  try {
    // Convert to JPEG with Sharp first
    await new Promise((resolve, reject) => {
      sourceStream
        .pipe(
          sharp()
            .rotate()
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg(),
        )
        .pipe(createWriteStream(inputPath))
        .on("finish", resolve)
        .on("error", reject);
    });

    await execFileAsync(mozjpeg, [
      ...MOZJPEG_DEFAULT_ARGS,
      "-outfile",
      outputPath,
      inputPath,
    ]);

    return createReadStream(outputPath);
  } finally {
    process.nextTick(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });
  }
}
