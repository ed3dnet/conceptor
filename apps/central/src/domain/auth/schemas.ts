import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { AuthConnectorIds } from "../auth-connectors/id.js";
import { TenantIds } from "../tenants/id.js";

export const OAuthState = Type.Object({
  tenantId: TenantIds.TRichId,
  authConnectorId: AuthConnectorIds.TRichId,
  nonce: Type.String(),
  redirectUri: Type.String(),
  // pkceVerifier: Type.String(),
});
export type OAuthState = Static<typeof OAuthState>;
export const OAuthStateChecker = TypeCompiler.Compile(OAuthState);
