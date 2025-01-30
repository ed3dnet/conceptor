import { type Static, Type } from "@sinclair/typebox";

export const PasetoAsymmetricKeyPair = Type.Object({
  type: Type.Literal("paseto-v4-private"),
  publicKey: Type.String(),
  secretKey: Type.String(),
});
export type PasetoAsymmetricKeyPair = Static<typeof PasetoAsymmetricKeyPair>;

export const PasetoLocalKeyPair = Type.Object({
  type: Type.Literal("paseto-v4-local"),
  key: Type.String(),
});
export type PasetoLocalKeyPair = Static<typeof PasetoLocalKeyPair>;
