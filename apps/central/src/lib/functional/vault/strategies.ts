export const ENCRYPTION_STRATEGIES = {
  "aes256-gcm": {
    keyLength: 32, // 256 bits
    ivLength: 16, // 128 bits
    authTagLength: 16,
    algorithm: "aes-256-gcm",
  },
} as const;

export type EncryptionStrategy = keyof typeof ENCRYPTION_STRATEGIES;
