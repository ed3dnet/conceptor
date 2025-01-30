import { activity } from "../../../../_worker/activity-helpers.js";
import { type S3BucketName } from "../../../object-store/config.js";
import { type ImageAnalysis } from "../../processing/analyze.js";

export interface GenerateWebPActivityInput {
  imageId: string;
  sourceBucket: S3BucketName;
  sourceObject: string;
  analysis: ImageAnalysis;
  targetBucket: S3BucketName;
  targetPath: string;
}

export interface GenerateWebPActivityOutput {
  renditionFormat: "image/webp";
}

export const generateWebPActivity = activity("generateWebP", {
  fn: async (
    _context,
    logger,
    deps,
    input: GenerateWebPActivityInput,
  ): Promise<GenerateWebPActivityOutput> => {
    const { images } = deps;
    logger.debug("entering generateWebPActivity");
    await images.generateWebP(
      input.imageId,
      input.sourceBucket,
      input.sourceObject,
      input.analysis,
      input.targetBucket,
      input.targetPath,
    );

    logger.debug("exiting generateWebPActivity");
    return { renditionFormat: "image/webp" };
  },
});
