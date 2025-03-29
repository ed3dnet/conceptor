import { command, positional, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";
import { ImageUploadIds } from "../../lib/functional/images/id.js";

export const completeImageUploadCommand = command({
  name: "complete-image-upload",
  args: {
    tenantId: positional({
      type: string,
      displayName: "tenantId",
      description: "The tenant that created the upload",
    }),
    imageUploadId: positional({
      type: string,
      displayName: "imageUploadId",
      description: "The upload ID to complete",
    }),
  },
  handler: async ({ tenantId, imageUploadId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-image-upload",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const tenantDomain = await ROOT_CONTAINER.cradle.tenantDomain(
      TenantIds.ensure(tenantId),
    );

    const { imageId } = await tenantDomain.cradle.images.completeUpload(
      ImageUploadIds.ensure(imageUploadId),
    );

    ROOT_LOGGER.info({ imageId }, "Completed image upload");
    process.stdout.write(JSON.stringify({ imageId }) + "\n");
    process.exit(0);
  },
});
