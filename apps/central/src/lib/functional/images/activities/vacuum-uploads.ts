import { count } from "console";

import { and, lt, exists, eq, arrayContains, not } from "drizzle-orm";

import { IMAGE_UPLOADS, IMAGES } from "../../../../_db/schema/index.js";
import { activity } from "../../../../_worker/activity-helpers.js";
import { type TenantId, TenantIds } from "../../../../domain/tenants/id.js";
import { ImageUploadIds } from "../id.js";

export interface VacuumUploadsActivityInput {
  tenantId: TenantId;
}

export const vacuumUploadsActivity = activity("vacuumUploads", {
  fn: async (
    _context,
    logger,
    deps,
    { tenantId }: VacuumUploadsActivityInput,
  ): Promise<void> => {
    logger.debug("entering vacuumUploadsActivity");

    const { db } = deps;
    const { images } = (await deps.tenantDomainBuilder(tenantId)).cradle;

    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const tenantIdUuid = TenantIds.toUUID(tenantId);

    // Find and delete incomplete uploads older than 20 minutes
    const incompleteUploads = await db
      .select()
      .from(IMAGE_UPLOADS)
      .where(
        and(
          lt(IMAGE_UPLOADS.createdAt, twentyMinutesAgo),
          not(
            exists(
              db
                .select()
                .from(IMAGES)
                .where(
                  and(
                    eq(IMAGES.imageUploadId, IMAGE_UPLOADS.imageUploadId),
                    eq(IMAGES.tenantId, tenantIdUuid),
                  ),
                )
                .limit(1),
            ),
          ),
        ),
      );

    // Find and delete completed uploads older than 24 hours
    const completedUploads = await db
      .select()
      .from(IMAGE_UPLOADS)
      .where(
        and(
          lt(IMAGE_UPLOADS.createdAt, twentyFourHoursAgo),
          exists(
            db
              .select()
              .from(IMAGES)
              .where(
                and(
                  eq(IMAGES.imageUploadId, IMAGE_UPLOADS.imageUploadId),
                  eq(IMAGES.tenantId, tenantIdUuid),
                  arrayContains(IMAGES.readyRenditions, ["fallback"]),
                ),
              )
              .limit(1),
          ),
        ),
      );

    if (incompleteUploads.length > 0 || completedUploads.length > 0) {
      logger.info(
        {
          incompleteUploads: incompleteUploads.length,
          completedUploads: completedUploads.length,
        },
        "Vacuuming old uploads",
      );
    }

    const awaiter = await Promise.allSettled([
      ...incompleteUploads.map((upload) =>
        images.deleteUpload(ImageUploadIds.toRichId(upload.imageUploadId)),
      ),
      ...completedUploads.map((upload) =>
        images.deleteUpload(ImageUploadIds.toRichId(upload.imageUploadId)),
      ),
    ]);

    logger.info({ count: awaiter.length }, "Finished vacuuming uploads");

    logger.debug("exiting vacuumUploadsActivity");
  },
});
