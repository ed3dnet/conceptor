import { type RichId, createRichIdUtils } from "../../utils/rich-id.js";

export type ImageId = RichId<"img">;
export const ImageIds = createRichIdUtils("img");

export type ImageUploadId = RichId<"imgup">;
export const ImageUploadIds = createRichIdUtils("imgup");
