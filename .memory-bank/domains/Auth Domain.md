---
title: Auth Domain
type: note
permalink: domains/auth-domain
tags:
- '["auth"'
- '"oauth"'
- '"oidc"'
- '"session"'
- '"security"'
- '"paseto"'
- '"redis"'
- '"csrf-prevention"]'
---

# Auth Domain

## Purpose
Orchestrates the complete OAuth/OIDC authentication flow and manages user sessions for the application.

## Bounded Context
- **Core Responsibility**: OAuth flow orchestration, session management, token validation
- **No Rich ID**: Stateless service coordinating between other domains
- **Focus**: Authentication flow, not identity storage

## Key Concepts

### OAuth State Management
- Encrypted PASETO tokens for CSRF protection
- Redis-based replay attack prevention
- State includes tenant, connector, redirect URI, and nonce

### Session Management
- Database-backed session tokens with SHA256 hashing
- 16-day expiration with sliding window updates
- Session revocation and user access tracking

### OIDC Integration
- Dynamic client configuration from auth-connectors
- Authorization code flow with userinfo fetching
- Automatic user record updates from IdP claims

## Service Operations

### Flow Initiation
- `initiateOAuthFlow()`: Builds authorization URL with encrypted state
- Creates secure state token with tenant/connector context
- Handles redirect URI construction and scope management

### Flow Completion
- `TX_handleOIDCCallback()`: Processes OAuth callback with full validation
- Verifies state token integrity and prevents replay
- Exchanges authorization code for access token
- Fetches and updates user info from provider

### Session Operations
- `createSessionRow()`: Issues new session tokens
- `resolveSessionTokenToUser()`: Validates tokens and returns user
- Updates both session and user access timestamps
- Handles token expiration and user status checks

### Security
- `verifyOAuthState()`: Validates and marks state tokens as used
- `decryptStateToken()`: Safely decrypts PASETO state tokens
- Redis-based nonce tracking prevents replay attacks

## Interactions

### With Auth-Connectors Domain
- Fetches connector configuration and domains
- Uses encrypted provider settings for OIDC discovery
- Validates connector belongs to expected tenant

### With Users Domain  
- Looks up existing users by email from IdP
- Updates user records with latest IdP information
- Creates sessions for authenticated users

### With Tenants Domain
- Validates tenant context in OAuth state
- Ensures authentication stays within tenant boundaries

### With External Services
- **Redis**: State replay prevention and caching
- **Vault**: Encrypts/decrypts sensitive auth state
- **OIDC Providers**: Token exchange and userinfo fetching

## Storage
- `USER_SESSIONS`: Session tokens with expiration tracking  
- Redis ephemeral storage for OAuth state nonce tracking
- No direct user/tenant storage (delegates to respective domains)

## Security Measures
- PASETO encrypted state tokens with expiration
- SHA256 hashed session tokens (never stored plaintext)
- Redis-based replay attack prevention
- Sliding session window with automatic cleanup
- Insecure provider support for development only

## Observations
- [concept] Auth domain orchestrates complete OAuth/OIDC authentication flow while delegating identity storage to other domains #auth #oauth #oidc #session-management
- [technique] PASETO encrypted state tokens with Redis nonce tracking prevent CSRF and replay attacks #security #csrf #replay-prevention #paseto
- [pattern] Session management uses SHA256 hashed tokens with sliding expiration windows #session-tokens #security #expiration
- [detail] Automatic user info updates from IdP claims keep user records synchronized with external identity providers #user-sync #idp-claims

## Relations
- part_of [[Central Project Architecture]]
- orchestrates [[Login Flow]]
- collaborates_with [[Auth-Connectors Domain]]
- collaborates_with [[Users Domain]]
- collaborates_with [[Tenants Domain]]
- secured_by [[Vault Service]]
- uses [[Redis]] for state management