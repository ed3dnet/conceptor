import { createHash } from "node:crypto";

export function sha256(input: string, iterations: number = 1): string {
  let result = input;
  for (let i = 0; i < iterations; i++) {
    result = createHash("sha256").update(result).digest("hex");
  }
  return result;
}
