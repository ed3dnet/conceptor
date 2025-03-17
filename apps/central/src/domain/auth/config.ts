import { type Static, Type } from "@sinclair/typebox";

export const AuthConfig = Type.Object({
  sessionCookie: Type.Object({
    name: Type.String(),
    domain: Type.String(),
    secure: Type.Boolean(),
    maxAgeMs: Type.Number(),
  }),
  oauth: Type.Object({
    statePasetoSymmetricKey: Type.Object({
      type: Type.Literal("paseto-v3-local"),
      key: Type.String(),
    }),
    stateExpirationSeconds: Type.Number(),
  }),
});
export type AuthConfig = Static<typeof AuthConfig>;
