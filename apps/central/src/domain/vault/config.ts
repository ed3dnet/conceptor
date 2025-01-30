import { type Static, Type } from "@sinclair/typebox";

export const VaultConfig = Type.Object({
  primaryKey: Type.String(),
  legacyKeys: Type.Optional(Type.Array(Type.String())),
});
export type VaultConfig = Static<typeof VaultConfig>;
