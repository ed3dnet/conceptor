import { fileTypeFromFile } from "file-type";
import { type Logger } from "pino";
import sharp from "sharp";
import { WebPInfo } from "webpinfo";

export const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
export type ImageMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export type ImageAnalysis = {
  width: number;
  height: number;
  format: string;
} & (
  | {
      mimeType: "image/webp";
      webp: {
        isLossless: boolean;
      };
    }
  | {
      mimeType: Exclude<ImageMimeType, "image/webp">;
    }
);

export async function analyzeImage(
  logger: Logger,
  filePath: string,
): Promise<ImageAnalysis> {
  const [fileType, metadata] = await Promise.all([
    fileTypeFromFile(filePath),
    sharp(filePath).metadata(),
  ]);

  if (!fileType) {
    throw new Error("Could not determine file type");
  }

  if (!SUPPORTED_MIME_TYPES.includes(fileType?.mime as ImageMimeType)) {
    throw new Error(
      "Unsupported image type: " + (fileType.mime ?? "undefined"),
    );
  }

  if (fileType.mime === "image/webp") {
    return {
      width: metadata.width!,
      height: metadata.height!,
      format: metadata.format!,
      mimeType: "image/webp",
      webp: {
        isLossless: await WebPInfo.isLossless(filePath),
      },
    };
  } else {
    return {
      width: metadata.width!,
      height: metadata.height!,
      format: metadata.format!,
      mimeType: fileType.mime as Exclude<ImageMimeType, "image/webp">,
    };
  }
}
