import { type StringUUIDType } from "../../lib/ext/typebox/index.js";
import { createRichIdUtils, type RichId } from "../../lib/utils/rich-id.js";

export type UserId = RichId<"user">;
export const UserIds = createRichIdUtils("user");
