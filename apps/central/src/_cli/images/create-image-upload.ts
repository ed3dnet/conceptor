import { command, positional, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { TenantIds } from "../../domain/tenants/id.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";
import { type ImageUsage } from "../../lib/functional/images/schemas.js";

export const createImageUploadCommand = command({
  name: "create-image-upload",
  args: {
    tenantId: positional({
      type: string,
      displayName: "tenantId",
      description: "The tenant that created the upload",
    }),
    usage: positional({
      type: string,
      displayName: "usage",
      description: "The usage type for this image (avatar, header, etc)",
    }),
  },
  handler: async ({ tenantId, usage }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-image-upload",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const { uploadUrl, imageUploadId } =
      await ROOT_CONTAINER.cradle.images.createUploadUrl(
        TenantIds.ensure(tenantId),
        usage as ImageUsage,
      );

    ROOT_LOGGER.info({ uploadUrl, imageUploadId }, "Created image upload");
    process.stdout.write(JSON.stringify({ uploadUrl, imageUploadId }) + "\n");
    process.exit(0);
  },
});
