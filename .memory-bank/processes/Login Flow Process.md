---
title: Login Flow Process
type: note
permalink: processes/login-flow-process
tags:
- auth
- login-flow
- oauth
- oidc
- security
- session
- tenant-isolation
---

# Login Flow Process

## Overview
Complete OAuth/OIDC authentication flow from user initiation through session creation, with tenant and connector context.

## Flow Steps

### 1. Authentication Initiation
**Trigger**: User visits `/{tenantId}/auth/{authConnectorId}/login?redirect_uri={url}`

**Process**:
- `AuthService.initiateOAuthFlow()` called with tenant, connector, and redirect URI
- Auth-connector retrieved and validated for tenant
- OIDC configuration fetched from provider's `.well-known/openid_configuration`
- Encrypted state token created containing:
  - Tenant ID and auth connector ID
  - Unique nonce for replay protection
  - Original redirect URI for post-auth routing
  - (Future: PKCE code verifier)

**State Token Security**:
- PASETO V3 encryption with symmetric key
- Configurable expiration (typically 10-15 minutes)
- Contains all context needed for callback validation

**Output**: Authorization URL redirect to identity provider

### 2. External Provider Authentication
**Provider Interaction**:
- User redirects to IdP (Google, Azure, etc.)
- User authenticates with external credentials
- Provider validates authorization request parameters
- Provider redirects to callback URL with authorization code

### 3. OAuth Callback Processing
**Trigger**: `/{tenantId}/auth/{authConnectorId}/callback?code={code}&state={state}`

**Validation Chain**:
```typescript
// 1. State token validation
const verifiedState = await this.verifyOAuthState(state);
// - Decrypts PASETO token
// - Validates expiration
// - Checks nonce hasn't been used (Redis)
// - Marks nonce as used to prevent replay

// 2. Context validation
if (verifiedState.tenantId !== expectedTenantId) throw BadRequestError
if (verifiedState.authConnectorId !== expectedAuthConnectorId) throw BadRequestError
```

### 4. Token Exchange
**Authorization Code Grant**:
- Fetch auth connector and decrypt provider configuration
- Exchange authorization code for access token using openid-client
- Validate ID token claims and extract user subject
- Fetch additional user info from provider's userinfo endpoint

**Retrieved Claims**:
- Subject (`sub`) - unique provider identifier  
- Email address (required)
- Profile information (name, picture, etc.)
- Optional claims based on requested scopes

### 5. User Resolution
**Database Transaction**:
```typescript
// 1. Lookup existing user by email
const user = await this.users.getByEmail(email);
if (!user) {
  throw InternalServerError("No user found for email");
}

// 2. Update user with latest IdP claims
await this.users.setUserIdPUserInfo(userId, {
  ...userInfo,
  email
}); // Encrypted storage via vault
```

### 6. Session Creation
**Session Generation**:
- Generate distinguishable token: `CPTR_V1_` + 32-char random string
- Hash token with SHA256 (4 rounds) for database storage
- Create session record with user and tenant association
- Set last accessed timestamp for both session and user

**Session Properties**:
- 16-day expiration with sliding window
- SHA256 hashed token (never stored plaintext)
- Linked to user and tenant for scoping
- Automatic cleanup of expired sessions

### 7. Response and Redirect
**Success Response**:
```typescript
return {
  sessionCookieName: "conceptor-session", // From config
  sessionId: "uuid-v4",
  sessionToken: "CPTR_V1_distinguishable-token",
  redirectTo: verifiedState.redirectUri ?? frontendBaseUrl
};
```

## Security Measures

### CSRF Protection
- Encrypted state tokens with nonce prevent cross-site request forgery
- State validation ensures callback matches initiated request

### Replay Attack Prevention  
- Redis-based nonce tracking with expiration
- Each state token can only be used once
- Automatic cleanup of expired nonces

### Session Security
- Cryptographically secure token generation
- SHA256 hashing prevents token extraction from database
- Sliding expiration window balances security and usability

### State Encryption
- PASETO V3 symmetric encryption with secure key derivation
- All sensitive context encrypted in state token
- Tamper-evident token format

## Error Handling

### Common Failures
- **Invalid State**: Expired, tampered, or replayed state tokens
- **User Not Found**: Email from IdP doesn't match existing user
- **Connector Mismatch**: State context doesn't match callback URL
- **Provider Errors**: Token exchange or userinfo fetch failures

### Recovery Patterns
- Clear error messages without exposing internals
- Structured logging for debugging
- Graceful degradation for provider outages

## Multi-Tenant Isolation
- State token contains tenant context
- All operations validated against expected tenant
- Session scoped to tenant boundary
- Cross-tenant authentication prevented

## Observations
- [technique] PASETO encrypted state tokens with Redis nonce tracking provide comprehensive CSRF and replay attack protection #security #paseto #csrf-protection #replay-prevention
- [pattern] Database transaction ensures atomic user lookup, profile update, and session creation #transaction-safety #atomicity
- [detail] SHA256 hashed session tokens with sliding expiration balance security and usability for long-term sessions #session-security #token-hashing
- [concept] Complete OAuth flow orchestration maintains tenant context while delegating identity storage to appropriate domains #oauth-flow #tenant-isolation #domain-separation

## Relations
- implements [[Auth Domain]]
- uses [[Auth-Connectors Domain]]
- validates [[Users Domain]]
- enforces [[Tenants Domain]]
- secured_by [[Vault Service]]
- prevents_attacks [[CSRF and Replay Protection]]