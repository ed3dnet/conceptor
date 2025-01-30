/* eslint-disable no-restricted-globals */
import fs from "fs/promises";
import path from "path";

import ts from "typescript";

const inputPath = path.join(import.meta.dirname, "../src/generated/paths.ts");
const outputPath = path.join(import.meta.dirname, "../src/generated/types.ts");

async function generateTypes() {
  const program = ts.createProgram([inputPath], {});
  const sourceFile = program.getSourceFile(inputPath);

  if (!sourceFile) {
    throw new Error("Could not load source file");
  }

  const typeNames: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === "components") {
      const schemas = node.members.find(
        (member) =>
          ts.isPropertySignature(member) &&
          member.name.getText(sourceFile) === "schemas",
      );

      if (schemas && ts.isPropertySignature(schemas) && schemas.type) {
        if (ts.isTypeLiteralNode(schemas.type)) {
          schemas.type.members.forEach((member) => {
            if (ts.isPropertySignature(member) && member.name) {
              typeNames.push(member.name.getText(sourceFile));
            }
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const typeExports = typeNames
    .map((name) => `export type ${name} = components["schemas"]["${name}"];`)
    .join("\n");

  const content = `// Auto-generated from OpenAPI schemas
import type { components } from './paths.js';

${typeExports}
`;

  await fs.writeFile(outputPath, content, "utf-8");
  console.log("Generated types file at", outputPath);
}

generateTypes().catch(console.error);
