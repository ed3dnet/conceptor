#!/usr/bin/env node

import fs from 'fs/promises';
import jsonpatch from 'fast-json-patch';

async function main() {
  try {
    // Check if we have the required arguments
    if (process.argv.length < 4) {
      console.error('Usage: node script.js <target-file> <patch-file>');
      process.exit(1);
    }

    const targetFile = process.argv[2];
    const patchFile = process.argv[3];

    // Read the target file
    const targetContent = await fs.readFile(targetFile, 'utf8');
    const targetObj = JSON.parse(targetContent);

    // Read the patch file
    const patchContent = await fs.readFile(patchFile, 'utf8');
    const patchArray = JSON.parse(patchContent);

    // Apply the patch
    const result = jsonpatch.applyPatch(targetObj, patchArray);

    // Print the result to stdout
    console.log(JSON.stringify(result.newDocument, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
