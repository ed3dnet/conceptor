import { activity } from "../../../../../_worker/activity-helpers.js";
import { type TenantId } from "../../../../../domain/tenants/id.js";
import { type S3BucketName } from "../../../object-store/config.js";
import { type ImageId } from "../../id.js";
import { type ImageAnalysis } from "../../processing/analyze.js";

export interface GenerateAVIFActivityInput {
  tenantId: TenantId;
  imageId: ImageId;
  sourceBucket: S3BucketName;
  sourceObject: string;
  analysis: ImageAnalysis;
  targetBucket: S3BucketName;
  targetPath: string;
}

export interface GenerateAVIFActivityOutput {
  renditionFormat: "image/avif";
}

export const generateAVIFActivity = activity("generateAVIF", {
  fn: async (
    _context,
    logger,
    deps,
    input: GenerateAVIFActivityInput,
  ): Promise<GenerateAVIFActivityOutput> => {
    const { images } = (await deps.tenantDomainBuilder(input.tenantId)).cradle;
    logger.debug("entering generateAVIFActivity");
    await images.generateAVIF(
      input.imageId,
      input.sourceBucket,
      input.sourceObject,
      input.analysis,
      input.targetBucket,
      input.targetPath,
    );

    logger.debug("exiting generateAVIFActivity");
    return { renditionFormat: "image/avif" };
  },
});
