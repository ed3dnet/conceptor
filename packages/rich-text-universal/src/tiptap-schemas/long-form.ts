import { Editor, type Extensions } from "@tiptap/core";
import { type JSONContent } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
// import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";

import {
  type TiptapModeDetails,
  type TiptapValidateResult,
} from "./_shared.js";

const longFormExtensions: Extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      rel: "noopener noreferrer",
      class: "lf-link",
    },
  }),
  // Image.configure({
  //   HTMLAttributes: {
  //     class: "blog-image",
  //   },
  // }),
  CodeBlock.configure({
    languageClassPrefix: "codelang  -",
    HTMLAttributes: {
      class: "lf-code",
    },
  }),
] as const;

function validateLongFormContent(json: unknown): TiptapValidateResult {
  try {
    // Create an editor instance without DOM
    const editor = new Editor({
      extensions: [...longFormExtensions],
    });

    // Get the schema that Tiptap built from our extensions
    const schema = editor.schema;

    // Try to create a PM Node from the JSON
    ProsemirrorNode.fromJSON(schema, json);

    // Clean up
    editor.destroy();

    return { valid: true };
  } catch (e) {
    if (e instanceof Error) {
      return { valid: false, errors: [e.message] };
    }

    return { valid: false, errors: ["Unknown error"] };
  }
}

export const longFormModeDetails: TiptapModeDetails = {
  name: "long-form",
  extensions: longFormExtensions,
  validator: validateLongFormContent,
} as const;
