import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const OAuthState = Type.Object({
  tenantId: Type.String({ format: "uuid" }),
  authConnectorId: Type.String({ format: "uuid" }),
  nonce: Type.String(),
  redirectUri: Type.String({ format: "uri" }),
  pkceVerifier: Type.String(),
});
export type OAuthState = Static<typeof OAuthState>;
export const OAuthStateChecker = TypeCompiler.Compile(OAuthState);
