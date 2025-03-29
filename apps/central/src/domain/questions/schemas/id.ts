import { createRichIdUtils, type RichId } from "../../../lib/utils/rich-id.js";

export type AskId = RichId<"ask">;
export const AskIds = createRichIdUtils("ask");

export type AskReferenceId = RichId<"askref">;
export const AskReferenceIds = createRichIdUtils("askref");

export type AskResponseId = RichId<"askresp">;
export const AskResponseIds = createRichIdUtils("askresp");
