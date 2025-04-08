import { InternalServerError } from "@myapp/shared-universal/errors/index.js";

import { bufferToBase64, base64ToBuffer } from "./helpers.js";
import { type VaultKeyStore } from "./keystore.js";
import { type Sensitive } from "./schemas.js";
import { ENCRYPTION_STRATEGIES } from "./strategies.js";

export class VaultService {
  constructor(private readonly keyStore: VaultKeyStore) {}

  async encrypt<T>(value: T): Promise<Sensitive<T>> {
    const [primaryVersion, key] = this.keyStore.getPrimaryKey();
    const strategy = ENCRYPTION_STRATEGIES[key.strategy];

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(strategy.ivLength));

    // Convert the key to a CryptoKey
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key.key,
      strategy.algorithm,
      false,
      ["encrypt"],
    );

    // Encrypt the data
    const jsonData = JSON.stringify(value);
    const encodedData = new TextEncoder().encode(jsonData);
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: strategy.algorithm.name,
        iv,
        tagLength: strategy.authTagLength * 8, // Tag length in bits
      },
      cryptoKey,
      encodedData,
    );

    // For HMAC
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      key.key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    // Combine IV and encrypted data for HMAC
    const combinedData = new Uint8Array(iv.length + encryptedData.byteLength);
    combinedData.set(iv, 0);
    combinedData.set(new Uint8Array(encryptedData), iv.length);

    // Generate HMAC
    const hmac = await crypto.subtle.sign("HMAC", hmacKey, combinedData);

    return {
      v: 1,
      s: key.strategy,
      k: primaryVersion,
      iv: bufferToBase64(iv),
      d: bufferToBase64(new Uint8Array(encryptedData)),
      h: bufferToBase64(new Uint8Array(hmac)),
    };
  }

  async decrypt<T>(envelope: Sensitive<T>): Promise<T> {
    const key = this.keyStore.getKey(envelope.k);
    if (!key) {
      throw new InternalServerError("No matching key found for decryption");
    }

    const strategy = ENCRYPTION_STRATEGIES[key.strategy];
    const iv = base64ToBuffer(envelope.iv);
    const encryptedData = base64ToBuffer(envelope.d);
    const providedHmac = base64ToBuffer(envelope.h);

    if (iv.length !== strategy.ivLength) {
      throw new InternalServerError("Invalid IV length");
    }

    // For HMAC verification
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      key.key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // Combine IV and encrypted data for HMAC verification
    const combinedData = new Uint8Array(iv.length + encryptedData.length);
    combinedData.set(iv, 0);
    combinedData.set(encryptedData, iv.length);

    // Verify HMAC
    const isValid = await crypto.subtle.verify(
      "HMAC",
      hmacKey,
      providedHmac,
      combinedData,
    );

    if (!isValid) {
      throw new InternalServerError("Invalid HMAC");
    }

    // Convert the key to a CryptoKey
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key.key,
      strategy.algorithm,
      false,
      ["decrypt"],
    );

    try {
      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: strategy.algorithm.name,
          iv,
          tagLength: strategy.authTagLength * 8, // Tag length in bits
        },
        cryptoKey,
        encryptedData,
      );

      const decodedText = new TextDecoder().decode(
        new Uint8Array(decryptedData),
      );
      return JSON.parse(decodedText);
    } catch (err) {
      throw new InternalServerError(
        "Decryption failed - corrupted data or wrong key",
      );
    }
  }
}
