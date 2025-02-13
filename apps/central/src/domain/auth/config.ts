import { type Static, Type } from "@sinclair/typebox";

export const AuthConfig = Type.Object({
  oauth: Type.Object({
    statePasetoSymmetricKey: Type.Object({
      type: Type.Literal("paseto-v3-local"),
      key: Type.String(),
    }),
    stateExpirationSeconds: Type.Number(),
  }),
});
export type AuthConfig = Static<typeof AuthConfig>;
