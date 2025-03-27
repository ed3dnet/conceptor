import { dirname } from "path";

import { findUpSync } from "find-up";

/**
 * Finds the repository root directory by locating the workspace root package.json
 * @returns The absolute path to the repository root
 */
export function findRepoRoot(): string {
  // First find the nearest package.json (could be a workspace package)
  const nearestPackageJson = findUpSync("package.json");
  if (!nearestPackageJson) {
    throw new Error("Could not find package.json in any parent directory");
  }

  // Then find the workspace root package.json (one directory up from the first one)
  const workspaceRoot = findUpSync("package.json", {
    cwd: dirname(dirname(nearestPackageJson)),
    stopAt: dirname(dirname(dirname(nearestPackageJson))),
  });

  if (!workspaceRoot) {
    // If we can't find a workspace root, just return the directory of the nearest package.json
    return dirname(nearestPackageJson);
  }

  return dirname(workspaceRoot);
}
