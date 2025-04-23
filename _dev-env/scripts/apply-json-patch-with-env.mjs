#!/usr/bin/env node

import fs from 'fs/promises';
import jsonpatch from 'fast-json-patch';

// Function to replace environment variables in a string
function replaceEnvVars(value) {
  if (typeof value !== 'string') return value;

  // Look for #{VAR}# pattern
  const envVarRegex = /#{([^}]+)}#/g;
  let match;
  let hasReplacement = false;
  let result = value;

  // Create a set to track all env vars we need
  const requiredEnvVars = new Set();

  // Find all environment variables in the string
  while ((match = envVarRegex.exec(value)) !== null) {
    const envVar = match[1];
    requiredEnvVars.add(envVar);

    if (process.env[envVar] === undefined) {
      throw new Error(`Required environment variable ${envVar} is not set`);
    }

    hasReplacement = true;
  }

  // Only do the replacement if we found variables to replace
  if (hasReplacement) {
    result = value.replace(envVarRegex, (match, envVar) => {
      return process.env[envVar];
    });
  }

  return result;
}

// Function to recursively process all values in an object or array
function processObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => processObject(item));
  } else if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = processObject(obj[key]);
    }
    return result;
  } else {
    return replaceEnvVars(obj);
  }
}

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

    // Process environment variables in the patch
    const processedPatch = processObject(patchArray);

    // Apply the patch
    const result = jsonpatch.applyPatch(targetObj, processedPatch);

    // Print the result to stdout
    console.log(JSON.stringify(result.newDocument, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
