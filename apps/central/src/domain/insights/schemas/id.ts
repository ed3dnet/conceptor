import { type RichId, createRichIdUtils } from "../../../lib/utils/rich-id.js";

export type AnswerId = RichId<"answer">;
export const AnswerIds = createRichIdUtils("answer");
