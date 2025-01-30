import { randomBytes } from "crypto";

import { ulid } from "ulidx";

import { ENCRYPTION_STRATEGIES } from "./strategies.js";

export function generateVaultKey(
  strategy: keyof typeof ENCRYPTION_STRATEGIES = "aes256-gcm",
): string {
  const keyConfig = ENCRYPTION_STRATEGIES[strategy];
  const keyData = randomBytes(keyConfig.keyLength);

  const version = Math.floor(Math.random() * 10000000);

  return `${strategy}:${version}:${keyData.toString("base64")}`;
}
