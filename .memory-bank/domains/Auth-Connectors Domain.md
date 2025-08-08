---
title: Auth-Connectors Domain
type: note
permalink: domains/auth-connectors-domain
tags:
- '["auth"'
- '"oidc"'
- '"domains"'
- '"tenant"'
- '"identity-provider"'
- '"vault"'
- '"encryption"]'
---

# Auth-Connectors Domain

## Purpose
Manages external identity provider configurations and their domain associations for tenant-specific authentication.

## Bounded Context
- **Core Responsibility**: OIDC/OAuth provider configuration management
- **Entity**: AuthConnector with associated domains
- **Rich ID**: `authconnector-{ULID}` format

## Key Concepts

### AuthConnector Entity
- Stores OIDC provider configuration (endpoint, client credentials, scopes)
- Encrypted state containing provider settings and fetched configuration
- Associated with a specific tenant
- Can handle multiple domains for email-based routing

### Domain Association
- Links email domains to specific auth connectors
- Enables tenant and provider discovery from email addresses
- Supports multi-domain organizations

## Service Operations

### Configuration Management
- `TX_createConnector()`: Creates new OIDC provider configuration
- `TX_updateConnector()`: Updates existing provider settings
- `TX_deleteConnector()`: Removes provider configuration
- `fetchOpenIDConfiguration()`: Validates and caches OIDC discovery

### Domain Management  
- `addDomain()`: Associates domain with connector
- `deleteDomain()`: Removes domain association
- `getByDomain()`: Finds connectors by email domain

### Lookup Operations
- `getById()`: Retrieves connector by ID
- `getByTenantId()`: Lists tenant's connectors
- `toPublic()`: Converts to external API representation

## Interactions

### With Tenants Domain
- Each AuthConnector belongs to exactly one tenant
- Tenant deletion should cascade to connectors

### With Auth Domain
- Auth service uses connectors for OIDC flow initiation
- Provides provider configuration for token exchange
- Domain lookup enables email-based connector discovery

### With Vault Service
- All provider configurations encrypted at rest
- Client secrets and sensitive settings protected
- Automatic encryption/decryption on operations

### With Users Domain
- No direct interaction (mediated through Auth domain)
- Connector determines which provider validates user identity

## Storage
- `AUTH_CONNECTORS`: Main configuration table
- `AUTH_CONNECTOR_DOMAINS`: Domain-to-connector mapping
- Rich ID conversion for external APIs
- Encrypted state column for sensitive data

## Observations
- [concept] Auth-Connectors manage external identity provider configurations for tenant-specific OIDC/OAuth authentication #auth #oidc #tenant #identity-provider
- [technique] Domain association enables automatic provider discovery based on user email addresses #domain-routing #email-based-routing
- [pattern] All provider configurations stored encrypted using vault service for security #encryption #vault #security
- [detail] Supports OIDC discovery protocol for automatic endpoint configuration #oidc-discovery #configuration

## Relations
- part_of [[Central Project Architecture]]
- collaborates_with [[Auth Domain]]
- collaborates_with [[Tenants Domain]]
- secured_by [[Vault Service]]
- enables [[Login Flow]]