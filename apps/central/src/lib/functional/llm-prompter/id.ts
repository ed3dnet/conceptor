import { type RichId, createRichIdUtils } from "../../utils/rich-id.js";

export type ConversationId = RichId<"convo">;
export const ConversationIds = createRichIdUtils("convo");
