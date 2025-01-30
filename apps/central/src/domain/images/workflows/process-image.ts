import * as workflow from "@temporalio/workflow";

import { type S3BucketName } from "../../object-store/config.js";
import { type analyzeImageActivity } from "../activities/process-image/analyze.js";
import { type generateAVIFActivity } from "../activities/process-image/generate-avif.js";
import { type generateFallbackActivity } from "../activities/process-image/generate-fallback.js";
import { type generateWebPActivity } from "../activities/process-image/generate-webp.js";
import { type optimizeOriginalActivity } from "../activities/process-image/optimize-original.js";

const {
  analyzeImage,
  optimizeOriginal,
  generateFallback,
  generateWebP,
  generateAVIF,
} = workflow.proxyActivities<{
  analyzeImage: (typeof analyzeImageActivity)["activity"];
  optimizeOriginal: (typeof optimizeOriginalActivity)["activity"];
  generateFallback: (typeof generateFallbackActivity)["activity"];
  generateWebP: (typeof generateWebPActivity)["activity"];
  generateAVIF: (typeof generateAVIFActivity)["activity"];
}>({
  startToCloseTimeout: "1 hour",
});

const MINIMUM_PIXELS_FOR_AVIF = 1280 * 720;

export interface ProcessImageWorkflowInput {
  imageId: string;
  sourceBucket: S3BucketName;
  sourceObject: string;
  targetBucket: S3BucketName;
  targetPath: string;
}

export async function processImageWorkflow(
  input: ProcessImageWorkflowInput,
): Promise<void> {
  workflow.log.info("Starting image processing workflow", {
    imageId: input.imageId,
  });

  const { analysis } = await analyzeImage({
    imageId: input.imageId,
    sourceBucket: input.sourceBucket,
    sourceObject: input.sourceObject,
  });

  const pixelCount = analysis.width * analysis.height;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const optimizationTasks: Array<Promise<any>> = [];

  if (analysis.mimeType === "image/jpeg" || analysis.mimeType === "image/png") {
    workflow.log.info("Enqueueing original image optimization.");
    optimizationTasks.push(
      optimizeOriginal({
        ...input,
        analysis,
      }),
    );
  } else {
    workflow.log.info("Enqueueing fallback image conversion.");
    optimizationTasks.push(
      generateFallback({
        ...input,
        analysis,
      }),
    );
  }

  if (analysis.mimeType !== "image/webp") {
    workflow.log.info("Enqueueing WebP conversion.");
    optimizationTasks.push(
      generateWebP({
        ...input,
        analysis,
      }),
    );
  }

  // TODO:  we're going to leave AVIF disabled until we have a way to have
  //        lower-priority jobs.

  // if (analysis.mimeType !== "image/avif") {
  //   if (pixelCount >= MINIMUM_PIXELS_FOR_AVIF) {
  //     workflow.log.info("Enqueueing AVIF conversion.");
  //     optimizationTasks.push(
  //       generateAVIF({
  //         ...input,
  //         analysis,
  //       }),
  //     );
  //   } else {
  //     workflow.log.info("Not generating AVIF for image", {
  //       pixelCount,
  //       minimumPixelsForAVIF: MINIMUM_PIXELS_FOR_AVIF,
  //     });
  //   }
  // }

  await Promise.all(optimizationTasks);
  workflow.log.info("Finished image processing workflow", {
    imageId: input.imageId,
  });
}
