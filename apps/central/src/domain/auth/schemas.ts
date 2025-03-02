import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { StringUUID } from "../../lib/ext/typebox.js";

export const OAuthState = Type.Object({
  tenantId: StringUUID,
  authConnectorId: StringUUID,
  nonce: Type.String(),
  redirectUri: Type.String(),
  // pkceVerifier: Type.String(),
});
export type OAuthState = Static<typeof OAuthState>;
export const OAuthStateChecker = TypeCompiler.Compile(OAuthState);
