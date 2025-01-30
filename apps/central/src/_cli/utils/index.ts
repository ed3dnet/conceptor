import { subcommands } from "cmd-ts";

import { createVaultKeyCommand } from "./create-vault-key.js";
import { generatePasetoAsymmetricKeysCommand } from "./generate-paseto-asymmetric-keys.js";
import { generatePasetoSymmetricKeysCommand } from "./generate-paseto-symmetric-keys.js";
import { printOpenapiCommand } from "./print-openapi.js";

const subs = [
  printOpenapiCommand,
  generatePasetoAsymmetricKeysCommand,
  generatePasetoSymmetricKeysCommand,
  createVaultKeyCommand,
].sort((a, b) => a.name.localeCompare(b.name));

export const UTILS_CLI = subcommands({
  name: "utils",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
