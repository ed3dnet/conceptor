import { command } from "cmd-ts";

import { generateVaultKey } from "../../domain/vault/helpers.js";

export const createVaultKeyCommand = command({
  name: "create-vault-key",
  description: "Generates a new vault key for encrypting sensitive data",
  args: {},
  handler: async () => {
    const key = generateVaultKey();
    process.stdout.write(key + "\n");
  },
});
