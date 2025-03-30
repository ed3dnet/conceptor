import { activity } from "../../../../../_worker/activity-helpers.js";
import { type TenantId } from "../../../../../domain/tenants/id.js";
import { type S3BucketName } from "../../../object-store/config.js";
import { type ImageId } from "../../id.js";
import { type ImageAnalysis } from "../../processing/analyze.js";

export interface OptimizeOriginalActivityInput {
  tenantId: TenantId;
  imageId: ImageId;
  sourceBucket: S3BucketName;
  sourceObject: string;
  analysis: ImageAnalysis;
  targetBucket: S3BucketName;
  targetPath: string;
}

export interface OptimizeOriginalActivityOutput {
  renditionFormat: string;
}

export const optimizeOriginalActivity = activity("optimizeOriginal", {
  fn: async (
    _context,
    logger,
    deps,
    input: OptimizeOriginalActivityInput,
  ): Promise<OptimizeOriginalActivityOutput> => {
    const { images } = (await deps.tenantDomainBuilder(input.tenantId)).cradle;
    logger.debug("entering optimizeOriginalActivity");
    await images.optimizeOriginal(
      input.imageId,
      input.sourceBucket,
      input.sourceObject,
      input.analysis,
      input.targetBucket,
      input.targetPath,
    );

    const renditionFormat =
      input.analysis.mimeType === "image/jpeg" ||
      input.analysis.mimeType === "image/png"
        ? "fallback"
        : input.analysis.mimeType;

    logger.debug("exiting optimizeOriginalActivity");
    return { renditionFormat };
  },
});
