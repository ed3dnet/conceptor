import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { StringEnum } from "../../../lib/ext/typebox/index.js";

export const ClaimTypes = StringEnum(["normal", "aggregated", "distributed"]);
export type ClaimTypes = Static<typeof ClaimTypes>;

export const CodeChallengeMethods = StringEnum(["plain", "S256"]);
export type CodeChallengeMethods = Static<typeof CodeChallengeMethods>;

export const DisplayValues = StringEnum(["page", "popup", "touch", "wap"]);
export type DisplayValues = Static<typeof DisplayValues>;

export const GrantTypes = StringEnum([
  "authorization_code",
  "implicit",
  "password",
  "client_credentials",
  "refresh_token",
  "urn:ietf:params:oauth:grant-type:jwt-bearer",
  "urn:ietf:params:oauth:grant-type:device_code",
]);
export type GrantTypes = Static<typeof GrantTypes>;

export const ResponseModes = StringEnum([
  "query",
  "fragment",
  "form_post",
  "jwt",
]);
export type ResponseModes = Static<typeof ResponseModes>;

export const ResponseTypes = StringEnum([
  "code",
  "token",
  "id_token",
  "code token",
  "code id_token",
  "token id_token",
  "code token id_token",
]);
export type ResponseTypes = Static<typeof ResponseTypes>;

export const SubjectTypes = StringEnum(["public", "pairwise"]);
export type SubjectTypes = Static<typeof SubjectTypes>;

export const TokenEndpointAuthMethods = StringEnum([
  "client_secret_basic",
  "client_secret_post",
  "client_secret_jwt",
  "private_key_jwt",
  "none",
]);
export type TokenEndpointAuthMethods = Static<typeof TokenEndpointAuthMethods>;

export const SigningAlgorithms = StringEnum([
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "ES256",
  "ES384",
  "ES512",
  "HS256",
  "HS384",
  "HS512",
]);
export type SigningAlgorithms = Static<typeof SigningAlgorithms>;

export const OidcConfiguration = Type.Object(
  {
    // Required fields
    issuer: Type.String(),
    authorization_endpoint: Type.String(),
    jwks_uri: Type.String(),
    response_types_supported: Type.Array(ResponseTypes),
    subject_types_supported: Type.Array(SubjectTypes),
    id_token_signing_alg_values_supported: Type.Array(SigningAlgorithms),

    // Optional fields
    acr_values_supported: Type.Optional(Type.Array(Type.String())),
    backchannel_logout_session_supported: Type.Optional(Type.Boolean()),
    backchannel_logout_supported: Type.Optional(Type.Boolean()),
    check_session_iframe: Type.Optional(Type.String()),
    claim_types_supported: Type.Optional(Type.Array(ClaimTypes)),
    claims_parameter_supported: Type.Optional(Type.Boolean()),
    claims_supported: Type.Optional(Type.Array(Type.String())),
    code_challenge_methods_supported: Type.Optional(
      Type.Array(CodeChallengeMethods),
    ),
    display_values_supported: Type.Optional(Type.Array(DisplayValues)),
    end_session_endpoint: Type.Optional(Type.String()),
    frontchannel_logout_session_supported: Type.Optional(Type.Boolean()),
    frontchannel_logout_supported: Type.Optional(Type.Boolean()),
    grant_types_supported: Type.Optional(Type.Array(GrantTypes)),
    introspection_endpoint: Type.Optional(Type.String()),
    registration_endpoint: Type.Optional(Type.String()),
    request_object_signing_alg_values_supported: Type.Optional(
      Type.Array(SigningAlgorithms),
    ),
    response_modes_supported: Type.Optional(Type.Array(ResponseModes)),
    revocation_endpoint: Type.Optional(Type.String()),
    scopes_supported: Type.Optional(Type.Array(Type.String())),
    service_documentation: Type.Optional(Type.String()),
    token_endpoint: Type.Optional(Type.String()),
    token_endpoint_auth_methods_supported: Type.Optional(
      Type.Array(TokenEndpointAuthMethods),
    ),
    token_endpoint_auth_signing_alg_values_supported: Type.Optional(
      Type.Array(SigningAlgorithms),
    ),
    ui_locales_supported: Type.Optional(Type.Array(Type.String())),
    userinfo_endpoint: Type.Optional(Type.String()),
  },
  {
    additionalProperties: true,
  },
);

export type OidcConfiguration = Static<typeof OidcConfiguration>;

export const OidcConfigurationChecker = TypeCompiler.Compile(OidcConfiguration);
