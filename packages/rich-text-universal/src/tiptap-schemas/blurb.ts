import { Editor, type Extensions, type Extension } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Document from "@tiptap/extension-document";
import Italic from "@tiptap/extension-italic";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";

import {
  type TiptapModeDetails,
  type TiptapValidateResult,
} from "./_shared.js";

const blurbExtensions: Extensions = [
  // We don't use StarterKit here since we want minimal extensions
  Document.configure({
    content: "paragraph", // Only allow a single paragraph
  }),
  Paragraph,
  Text,
  Bold,
  Italic,
] as const;

function validateBlurbContent(json: unknown): TiptapValidateResult {
  try {
    const editor = new Editor({
      extensions: [...blurbExtensions],
    });
    const schema = editor.schema;

    const doc = ProsemirrorNode.fromJSON(schema, json);
    const errors: string[] = [];

    // Ensure exactly one paragraph
    if (doc.childCount !== 1 || doc.firstChild?.type.name !== "paragraph") {
      errors.push("Blurb must contain exactly one paragraph");
    }

    // Ensure no unexpected node types
    doc.descendants((node) => {
      if (!["paragraph", "text"].includes(node.type.name)) {
        errors.push(`Unexpected node type: ${node.type.name}`);
      }
    });

    editor.destroy();

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (e) {
    if (e instanceof Error) {
      return {
        valid: false,
        errors: [e.message],
      };
    }

    return {
      valid: false,
      errors: ["Unknown error"],
    };
  }
}

export const blurbModeDetails: TiptapModeDetails = {
  name: "blurb",
  extensions: blurbExtensions,
  validator: validateBlurbContent,
} as const;
