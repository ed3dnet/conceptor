import { type RichId, createRichIdUtils } from "../../utils/rich-id.js";

export type TranscriptionJobId = RichId<"transcribe">;
export const TranscriptionJobIds = createRichIdUtils("transcribe");
