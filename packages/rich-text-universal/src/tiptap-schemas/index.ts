import { type TiptapModeDetails } from "./_shared.js";
import { blurbModeDetails } from "./blurb.js";
import { longFormModeDetails } from "./long-form.js";

export const tiptapModeDetails: TiptapModeDetails[] = [
  longFormModeDetails,
  blurbModeDetails,
] as const;
