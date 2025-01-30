import { analyzeImageActivity } from "./process-image/analyze.js";
import { generateAVIFActivity } from "./process-image/generate-avif.js";
import { generateFallbackActivity } from "./process-image/generate-fallback.js";
import { generateWebPActivity } from "./process-image/generate-webp.js";
import { optimizeOriginalActivity } from "./process-image/optimize-original.js";
import { vacuumUploadsActivity } from "./vacuum-uploads.js";

export const IMAGE_ACTIVITIES = [
  analyzeImageActivity,
  optimizeOriginalActivity,
  generateFallbackActivity,
  generateWebPActivity,
  generateAVIFActivity,

  vacuumUploadsActivity,
];
