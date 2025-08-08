---
title: Users Domain
type: note
permalink: domains/users-domain
tags:
- '["users"'
- '"identity"'
- '"multi-email"'
- '"external-ids"'
- '"vault"'
- '"privacy"'
- '"tags"'
- '"idp-integration"]'
---

# Users Domain

## Purpose
Manages user identity, profile information, and associated metadata within tenant boundaries.

## Bounded Context
- **Core Responsibility**: User lifecycle, profile management, identity correlation
- **Entity**: User with emails, external IDs, and tags
- **Rich ID**: `user-{ULID}` format

## Key Concepts

### User Identity
- Core user record with display name and avatar
- Tenant-scoped identity (users belong to single tenant)
- Connector association tracking authentication source

### Multi-Email Support
- Primary/secondary email management
- Email uniqueness within system
- Email-based user lookup and matching

### External ID Correlation
- Multiple external identity mappings per user
- Connector-specific sub identifiers (e.g., `google:sub`)
- Flexible external system integration

### User Tagging
- Key-value metadata system
- Email verification tracking
- Custom attributes for business logic

### IdP User Info
- Encrypted storage of identity provider claims
- Automatic updates during authentication
- Privacy-preserving encrypted vault storage

## Service Operations

### Core User Management
- `createUser()`: Full user creation with emails and external IDs
- `getUserPrivate()`: Complete user profile with associations
- Multi-entity transaction handling for related data

### Lookup Operations
- `getByUserId()`: Lookup by rich ID
- `getByEmail()`: Email-based user discovery
- `getByExternalId()`: External identity correlation
- `searchByTag()`: Tag-based user search with fuzzy matching

### Email Management
- `addUserEmail()`: Add additional email addresses
- `setUserEmailPrimary()`: Primary email designation
- `deleteUserEmail()`: Remove email addresses
- Primary email enforcement (exactly one primary)

### External ID Management
- `setUserExternalId()`: Map external identities
- `deleteUserExternalId()`: Remove identity mappings
- Upsert pattern for external ID updates

### Tag Management
- `setUserTag()`: Set key-value metadata
- `deleteUserTag()`: Remove user tags
- Tag-based search and filtering

### IdP Integration
- `setUserIdPUserInfo()`: Update encrypted IdP claims
- Vault-based encryption for privacy protection
- Automatic profile synchronization

## Interactions

### With Auth Domain
- User lookup by email during authentication
- IdP user info updates after successful login
- Session creation for authenticated users

### With Auth-Connectors Domain
- Connector ID association in user records
- External ID creation for connector sub values

### With Tenants Domain
- All users scoped within single tenant
- Tenant context required for all operations

### With Units Domain
- Users assigned to organizational units
- Assignment validation requires user existence

### With Events Domain
- User lifecycle events: Created, Updated
- Email events: Added, SetPrimary, Removed
- Event-driven workflow automation

### With Vault Service
- IdP user info encrypted storage
- Sensitive data protection
- Automatic encryption/decryption

## Storage
- `USERS`: Core user identity table
- `USER_EMAILS`: Multi-email support with primary flag
- `USER_EXTERNAL_IDS`: External identity mappings
- `USER_TAGS`: Key-value metadata
- `USER_SESSIONS`: Session management (via Auth domain)

## Privacy & Security
- IdP claims encrypted in vault
- No plaintext sensitive data in database
- Access tracking with lastAccessedAt timestamps
- User disabling without data deletion

## Event Integration
- Rich event system for user lifecycle
- Email management events for workflows
- Structured payloads with rich IDs
- Event squelching for bulk operations

## Data Model Patterns
- Rich ID external representation
- UUID internal storage
- Composite relationships (emails, tags, external IDs)
- Gravatar fallback for avatar URLs

## Observations
- [concept] Users domain manages complete user identity lifecycle with multi-email support and encrypted IdP claim storage #user-identity #multi-email #identity-provider-integration
- [technique] External ID correlation enables flexible mapping between internal users and multiple external identity systems #external-ids #identity-correlation #integration
- [pattern] Tag-based metadata system provides extensible user attributes for business logic and search #user-tags #metadata #flexible-attributes
- [detail] Vault-encrypted IdP user info storage protects sensitive identity provider claims while enabling profile synchronization #vault-encryption #privacy #idp-claims

## Relations
- part_of [[Central Project Architecture]]
- collaborates_with [[Auth Domain]]
- collaborates_with [[Auth-Connectors Domain]]
- scoped_by [[Tenants Domain]]
- assigned_to [[Units Domain]]
- publishes_to [[Events Domain]]
- secured_by [[Vault Service]]
- uses [[Rich IDs Usage Guide]]