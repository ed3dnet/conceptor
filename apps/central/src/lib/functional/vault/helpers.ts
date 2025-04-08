import { randomBytes } from "crypto";

import { ENCRYPTION_STRATEGIES } from "./strategies.js";

export function generateVaultKey(
  strategy: keyof typeof ENCRYPTION_STRATEGIES = "aes256-gcm",
): string {
  const keyConfig = ENCRYPTION_STRATEGIES[strategy];
  const keyData = randomBytes(keyConfig.keyLength);

  const version = Math.floor(Math.random() * 10000000);

  return `${strategy}:${version}:${keyData.toString("base64")}`;
}

export function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer));
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
