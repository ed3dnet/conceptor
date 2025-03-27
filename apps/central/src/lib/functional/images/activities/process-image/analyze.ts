import { activity } from "../../../../../_worker/activity-helpers.js";
import { type S3BucketName } from "../../../object-store/config.js";
import { type ImageId } from "../../id.js";
import { type ImageAnalysis } from "../../processing/analyze.js";

export interface AnalyzeImageActivityInput {
  imageId: ImageId;
  sourceBucket: S3BucketName;
  sourceObject: string;
}

export interface AnalyzeImageActivityOutput {
  analysis: ImageAnalysis;
  blurhash: string;
}

export const analyzeImageActivity = activity("analyzeImage", {
  fn: async (
    _context,
    logger,
    deps,
    input: AnalyzeImageActivityInput,
  ): Promise<AnalyzeImageActivityOutput> => {
    const { images } = deps;
    return await images.analyzeImage(
      input.imageId,
      input.sourceBucket,
      input.sourceObject,
    );
  },
});
