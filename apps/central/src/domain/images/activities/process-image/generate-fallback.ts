import { activity } from "../../../../_worker/activity-helpers.js";
import { type S3BucketName } from "../../../object-store/config.js";
import { type ImageAnalysis } from "../../processing/analyze.js";

export interface GenerateFallbackActivityInput {
  imageId: string;
  sourceBucket: S3BucketName;
  sourceObject: string;
  analysis: ImageAnalysis;
  targetBucket: S3BucketName;
  targetPath: string;
}

export interface GenerateFallbackActivityOutput {
  renditionFormat: "fallback";
}

export const generateFallbackActivity = activity("generateFallback", {
  fn: async (
    _context,
    logger,
    deps,
    input: GenerateFallbackActivityInput,
  ): Promise<GenerateFallbackActivityOutput> => {
    const { images } = deps;
    logger.debug("entering generateFallbackActivity");
    await images.generateFallback(
      input.imageId,
      input.sourceBucket,
      input.sourceObject,
      input.analysis,
      input.targetBucket,
      input.targetPath,
    );

    logger.debug("exiting generateFallbackActivity");
    return { renditionFormat: "fallback" };
  },
});
