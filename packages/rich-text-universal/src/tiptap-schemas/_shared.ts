import { type Extensions } from "@tiptap/core";

export type TiptapValidateResult =
  | { valid: true }
  | { valid: false; errors: string[] };

export type TiptapModeDetails = {
  name: string;
  extensions: Extensions;
  validator: (json: unknown) => TiptapValidateResult;
};
