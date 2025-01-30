import { InternalServerError } from "@myapp/shared-universal/errors/index.js";
import { type DeepReadonly } from "utility-types";

import { type VaultConfig } from "./config.js";
import {
  ENCRYPTION_STRATEGIES,
  type EncryptionStrategy,
} from "./strategies.js";

export type ParsedKey = {
  strategy: EncryptionStrategy;
  key: Buffer;
};

export class VaultKeyStore {
  private readonly keyStore = new Map<number, ParsedKey>();
  private readonly primaryKeyVersion: number;

  constructor(config: DeepReadonly<VaultConfig>) {
    const [primaryVersion, primaryKey] = this.parseKeyString(config.primaryKey);
    this.primaryKeyVersion = primaryVersion;
    this.keyStore.set(primaryVersion, primaryKey);

    for (const legacyKeyStr of config.legacyKeys ?? []) {
      const [version, key] = this.parseKeyString(legacyKeyStr);
      this.keyStore.set(version, key);
    }
  }

  getPrimaryKey(): [number, ParsedKey] {
    const key = this.keyStore.get(this.primaryKeyVersion);
    if (!key) {
      throw new InternalServerError("Primary key not found");
    }
    return [this.primaryKeyVersion, key];
  }

  getKey(version: number): ParsedKey | undefined {
    return this.keyStore.get(version);
  }

  private parseKeyString(keyStr: string): [number, ParsedKey] {
    const parts = keyStr.split(":");
    const [strategyRaw, versionStr, keyBase64] = parts;

    if (!strategyRaw || !versionStr || !keyBase64) {
      throw new InternalServerError(
        "Invalid key format - must be strategy:version:key",
      );
    }

    if (!(strategyRaw in ENCRYPTION_STRATEGIES)) {
      throw new InternalServerError(
        `Unsupported encryption strategy: ${strategyRaw}`,
      );
    }
    const strategy = strategyRaw as EncryptionStrategy;

    const version = parseInt(versionStr, 10);
    if (isNaN(version) || version < 1) {
      throw new InternalServerError("Key version must be a positive integer");
    }

    let keyBuffer: Buffer;
    try {
      keyBuffer = Buffer.from(keyBase64, "base64");
    } catch (err) {
      throw new InternalServerError("Invalid key encoding - must be base64");
    }

    if (keyBuffer.length !== ENCRYPTION_STRATEGIES[strategy].keyLength) {
      throw new InternalServerError(
        `Invalid key length for ${strategy} - expected ${ENCRYPTION_STRATEGIES[strategy].keyLength} bytes`,
      );
    }

    return [version, { strategy, key: keyBuffer }];
  }
}
