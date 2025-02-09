import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "crypto";

import { InternalServerError } from "@myapp/shared-universal/errors/index.js";
import { type Logger } from "pino";

import { type VaultKeyStore } from "./keystore.js";
import { type Sensitive } from "./schemas.js";
import { ENCRYPTION_STRATEGIES } from "./strategies.js";

export class VaultService {
  constructor(private readonly keyStore: VaultKeyStore) {}

  async encrypt<T>(value: T): Promise<Sensitive<T>> {
    const [primaryVersion, key] = this.keyStore.getPrimaryKey();
    const strategy = ENCRYPTION_STRATEGIES[key.strategy];
    const iv = randomBytes(strategy.ivLength);
    const cipher = createCipheriv(strategy.algorithm, key.key, iv);

    const jsonData = JSON.stringify(value);
    const encrypted = Buffer.concat([
      cipher.update(jsonData, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const hmac = createHmac("sha256", key.key)
      .update(Buffer.concat([iv, encrypted, authTag]))
      .digest();

    return {
      v: 1,
      s: key.strategy,
      k: primaryVersion,
      iv: iv.toString("base64"),
      d: Buffer.concat([encrypted, authTag]).toString("base64"),
      h: hmac.toString("base64"),
    };
  }

  async decrypt<T>(envelope: Sensitive<T>): Promise<T> {
    const key = this.keyStore.getKey(envelope.k);
    if (!key) {
      throw new InternalServerError("No matching key found for decryption");
    }

    const strategy = ENCRYPTION_STRATEGIES[key.strategy];
    const iv = Buffer.from(envelope.iv, "base64");
    const data = Buffer.from(envelope.d, "base64");
    const providedHmac = Buffer.from(envelope.h, "base64");

    if (iv.length !== strategy.ivLength) {
      throw new InternalServerError("Invalid IV length");
    }

    const encrypted = data.subarray(0, data.length - strategy.authTagLength);
    const authTag = data.subarray(data.length - strategy.authTagLength);

    const computedHmac = createHmac("sha256", key.key)
      .update(Buffer.concat([iv, encrypted, authTag]))
      .digest();

    if (!computedHmac.equals(providedHmac)) {
      throw new InternalServerError("Invalid HMAC");
    }

    const decipher = createDecipheriv(strategy.algorithm, key.key, iv);
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      return JSON.parse(decrypted.toString("utf8"));
    } catch (err) {
      throw new InternalServerError(
        "Decryption failed - corrupted data or wrong key",
      );
    }
  }
}
