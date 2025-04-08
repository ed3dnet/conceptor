export const ENCRYPTION_STRATEGIES = {
  "aes256-gcm": {
    keyLength: 32, // 256 bits
    ivLength: 16, // 128 bits
    authTagLength: 16,
    algorithm: { name: "AES-GCM", length: 256 },
  },
} as const;

export type EncryptionStrategy = keyof typeof ENCRYPTION_STRATEGIES;
