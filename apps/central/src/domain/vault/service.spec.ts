import { pino } from "pino";
import { describe, expect, it, beforeEach } from "vitest";

import { type VaultConfig } from "./config.js";
import { generateVaultKey } from "./helpers.js";
import { VaultKeyStore } from "./keystore.js";
import { VaultService } from "./service.js";

const TEST_LOGGER = pino({ level: "silent" });

describe("VaultService", () => {
  const validKey1 = generateVaultKey();
  const validKey2 = generateVaultKey();

  let keyStore: VaultKeyStore;
  let service: VaultService;

  beforeEach(() => {
    keyStore = new VaultKeyStore({
      primaryKey: validKey1,
      legacyKeys: [validKey2],
    });
    service = new VaultService(keyStore);
  });

  describe("encrypt", () => {
    it("encrypts string values", async () => {
      const result = await service.encrypt("test-string");
      expect(result).toHaveProperty("v", 1);
      expect(result).toHaveProperty("s", "aes256-gcm");
      expect(result).toHaveProperty("k");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("d");
      expect(result).toHaveProperty("h");
    });

    it("encrypts object values", async () => {
      const result = await service.encrypt({ foo: "bar", num: 123 });
      expect(result).toHaveProperty("v");
      expect(result).toHaveProperty("s");
      expect(result).toHaveProperty("k");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("d");
      expect(result).toHaveProperty("h");
    });

    it("encrypts array values", async () => {
      const result = await service.encrypt([1, 2, 3]);
      expect(result).toHaveProperty("v");
      expect(result).toHaveProperty("s");
      expect(result).toHaveProperty("k");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("d");
      expect(result).toHaveProperty("h");
    });

    it("encrypts null values", async () => {
      const result = await service.encrypt(null);
      expect(result).toHaveProperty("v");
      expect(result).toHaveProperty("s");
      expect(result).toHaveProperty("k");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("d");
      expect(result).toHaveProperty("h");
    });
  });

  describe("decrypt", () => {
    it("decrypts string values", async () => {
      const encrypted = await service.encrypt("test-string");
      const decrypted = await service.decrypt<string>(encrypted);
      expect(decrypted).toBe("test-string");
    });

    it("decrypts object values", async () => {
      const original = { foo: "bar", num: 123 };
      const encrypted = await service.encrypt(original);
      const decrypted = await service.decrypt<typeof original>(encrypted);
      expect(decrypted).toEqual(original);
    });

    it("decrypts array values", async () => {
      const original = [1, 2, 3];
      const encrypted = await service.encrypt(original);
      const decrypted = await service.decrypt<typeof original>(encrypted);
      expect(decrypted).toEqual(original);
    });

    it("decrypts null values", async () => {
      const encrypted = await service.encrypt(null);
      const decrypted = await service.decrypt<null>(encrypted);
      expect(decrypted).toBeNull();
    });

    it("decrypts with legacy key", async () => {
      // First encrypt with key 1
      const encrypted1 = await service.encrypt("test");

      // Switch to key 2 as primary
      const keyStore2 = new VaultKeyStore({
        primaryKey: validKey2,
        legacyKeys: [validKey1],
      });
      const service2 = new VaultService(keyStore2);

      // Should still decrypt with legacy key
      const decrypted = await service2.decrypt<string>(encrypted1);
      expect(decrypted).toBe("test");
    });

    it("rejects tampered data", async () => {
      const encrypted = await service.encrypt("test");
      const midPoint = Math.floor(encrypted.d.length / 2);
      encrypted.d =
        encrypted.d.slice(0, midPoint) +
        (encrypted.d[midPoint] === "A" ? "B" : "A") +
        encrypted.d.slice(midPoint + 1);
      await expect(service.decrypt(encrypted)).rejects.toThrow("Invalid HMAC");
    });

    it("rejects tampered IV", async () => {
      const encrypted = await service.encrypt("test");
      encrypted.iv = Buffer.from("tampered").toString("base64");
      await expect(service.decrypt(encrypted)).rejects.toThrow(
        "Invalid IV length",
      );
    });

    it("rejects unknown key version", async () => {
      const encrypted = await service.encrypt("test");
      encrypted.k = 999;
      await expect(service.decrypt(encrypted)).rejects.toThrow(
        "No matching key found",
      );
    });
  });

  describe("key rotation", () => {
    it("maintains correct decryptability through key rotation", async () => {
      // Encrypt with key 1
      const encrypted1 = await service.encrypt("test1");

      // Create new service with key 2 as primary
      const keyStore2 = new VaultKeyStore({
        primaryKey: validKey2,
        legacyKeys: [validKey1],
      });
      const service2 = new VaultService(keyStore2);

      // Encrypt with key 2
      const encrypted2 = await service2.encrypt("test2");

      // Create service with only key 1
      const keyStore1Only = new VaultKeyStore({
        primaryKey: validKey1,
      });
      const service1Only = new VaultService(keyStore1Only);

      // Verify expected behaviors
      expect(await service2.decrypt<string>(encrypted1)).toBe("test1");
      expect(await service2.decrypt<string>(encrypted2)).toBe("test2");
      expect(await service1Only.decrypt<string>(encrypted1)).toBe("test1");
      await expect(service1Only.decrypt(encrypted2)).rejects.toThrow(
        "No matching key found",
      );
    });
  });
});
