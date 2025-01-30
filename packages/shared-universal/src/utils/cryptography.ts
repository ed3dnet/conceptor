import { createHash } from "node:crypto";

export function sha512_256(input: string) {
  return createHash("sha512-256").update(input).digest("hex");
}
