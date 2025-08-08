---
title: Central Project Architecture
type: note
permalink: specs/central-project-architecture
tags:
- central
- fastify
- web
- worker
- temporal
- cli
- awilix
- di
- typebox
- api
- database
- drizzle
- logging
- pino
- auth
- tooling
- config
- bootstrap"
---

# Central Project Architecture

## Executive Overview

The Central project is a sophisticated TypeScript-based microservices application built around **Fastify (web)** and **Temporal (workers)** with a comprehensive **Awilix-based dependency injection** system. It follows a **domain-driven design** approach with clear separation between API, worker, and CLI entry points, all sharing a common set of services and infrastructure.

## Technical Implementation

### Web Service Architecture

**Framework & Core Technology:**
- **Fastify 5** with TypeScript type providers (@fastify/type-provider-typebox)
- **TypeBox** for schema-first API development with automatic OpenAPI generation
- **Rich ID system** (prefix-ULID format like `tenant-01H2XVNZ7C9NXWK3TMCRD9QWMN`)

**API Structure Pattern:**
```typescript
// Standard route structure in _api/routes/{domain}/
- routes.ts    // Fastify plugin with route definitions
- schemas.ts   // TypeBox schemas for request/response
```

**Route Registration:**
- Routes organized by domain (`auth`, `tenants`, `meta`, etc.)
- Each domain exports a Fastify plugin
- Plugins registered in `_api/routes/index.ts`
- Schema-first approach: **never inline JSON Schema**, always reference TypeBox schemas
- Automatic OpenAPI generation via `@eropple/fastify-openapi3`

**Security & Authentication:**
- `TenantUserCookie` security scheme for authenticated requests
- Built-in error handling with custom `ApplicationError` classes
- Request ID tracking and distributed tracing support

### Worker Service Architecture

**Temporal Integration:**
- **Temporal workflow engine** for distributed job processing
- Separate worker queues: `core`, `media`, `atproto`, `identity`
- Activities and workflows organized by domain
- Workers share the same codebase and dependency injection as the API

**Worker Organization:**
```typescript
_worker/
├── activities/        # All activities registered here
├── workflows/
│   ├── core/         # Core queue workflows
│   └── media/        # Media queue workflows
├── activity-helpers.ts  # Activity wrapper utilities
└── worker-context.ts    # DI container access in workers
```

**Activity Pattern:**
```typescript
export const doPingActivity = activity("doPing", {
  fn: async (_context, logger, deps) => {
    // Activity implementation with DI access
  }
});
```

## CLI Architecture

**Command Structure:**
- Built with **cmd-ts** for type-safe command definitions
- Organized as subcommands: `api`, `worker`, `db`, `seed`, `utils`, `fire-event`, `images`
- Single entry point: `pnpm cli:dev <subcommand>`

**Key Commands:**
```bash
pnpm cli:dev api start        # Start web server
pnpm cli:dev worker start core   # Start core worker
pnpm cli:dev db migrate       # Run database migrations
pnpm cli:dev seed apply       # Apply database seeds
```

**CLI Pattern:**
- Each subcommand is a separate module in `_cli/{command}/`
- Commands reuse the same bootstrap process as API/worker
- Full dependency injection available in CLI commands

## Dependency Injection System

**Framework: Awilix**
- **Comprehensive DI container** managing entire application lifecycle
- Three container scopes: **Singleton**, **Request**, and **Activity**

**Container Architecture:**
```typescript
// Singleton scope - shared across entire application
configureBaseAwilixContainer() -> AppSingletonCradle
  ├── Infrastructure (DB, Redis, Temporal, S3, etc.)
  ├── Services (Auth, Users, Tenants, etc.)
  └── Shared utilities (Logger, Fetch, Vault, etc.)

// Request scope - per-HTTP-request
configureRequestAwilixContainer() -> AppRequestCradle
  ├── Request-specific logger
  └── Request-specific config

// Activity scope - per-Temporal-activity
configureActivityAwilixContainer() -> AppActivityCradle
  └── Activity-specific context
```

**Service Registration Pattern:**
```typescript
container.register({
  serviceName: asFunction(({ dep1, dep2 }: CradleType) => 
    new ServiceClass(dep1, dep2)
  ).singleton(),  // or per-request
});
```

**Service Constructor Pattern:**
```typescript
export class UserService {
  private readonly logger: Logger;
  
  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly vault: VaultService,
    private readonly events: EventService,
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }
}
```

## Cross-Cutting Concerns & Standards

### Logging Architecture

**Structured Logging with Pino:**
- **Hierarchical logger system** - each service gets a child logger
- **Component-based logging**: `logger.child({ component: this.constructor.name })`
- **Request correlation**: Request ID and trace ID automatically included
- **Environment-aware**: Pretty printing in development, JSON in production

**Logging Pattern:**
```typescript
// Service-level logging
this.logger = logger.child({ component: this.constructor.name });

// Request-level logging  
request.log.info({ userId, action }, "User action performed");

// Worker activity logging
logger.info({ activityData }, "Activity completed");
```

### Database Architecture

**Drizzle ORM Integration:**
- **Separate read/write connections**: `DrizzleRO` (read-only) and `Drizzle` (read-write)
- **Connection pooling** with dedicated pools for each connection type
- **Query logging** integrated with Pino logger system
- **Snake case conversion** for PostgreSQL compatibility

**Database Service Patterns:**
```typescript
// Services take optional executor for transaction support
async getByUserId(
  userId: UserId,
  executor: DrizzleRO = this.dbRO,  // Default to read-only
): Promise<UserPublic | null>

// Transaction methods prefixed with TX_
async TX_createUserWithRoles(input: CreateUserInput): Promise<UserPrivate>
```

### Configuration Management

**Environment-Driven Config:**
- **TypeBox schemas** for configuration validation
- **Hierarchical config structure** with domain-specific sections
- **Type-safe configuration** throughout the application
- **Environment file support** via dotenvx

### Error Handling

**Structured Error Classes:**
- Custom `ApplicationError` hierarchy with HTTP status codes
- **Domain-specific errors**: `NotFoundError`, `ConflictError`, `ForbiddenError`
- **Automatic error serialization** in API responses
- **Request correlation** in error responses

### Rich ID System

**UUID-ULID Hybrid Approach:**
- **External IDs**: Rich format (`tenant-01H2XVNZ7C9NXWK3TMCRD9QWMN`)
- **Internal IDs**: Standard UUIDs in database
- **Automatic conversion** between formats in services
- **Type-safe ID handling** with domain-specific ID types

### Security Standards

**Authentication & Authorization:**
- **Cookie-based authentication** for web clients
- **Vault service** for sensitive data encryption
- **Security middleware** (Helmet, CORS)
- **Input validation** via TypeBox schemas

### Testing Architecture

**Multi-Level Testing:**
- **Unit tests**: Vitest with service-level testing
- **Integration tests**: Separate config for database integration
- **In-memory testing**: PgLite for isolated database tests

## Bootstrap Process

**Unified Bootstrap Pattern:**
```typescript
// Shared across API, Worker, and CLI
bootstrapNode(loggerName, config, options) ->
  ├── Create structured logger
  ├── Configure base Awilix container  
  ├── Run database migrations (optional)
  └── Return { APP_CONFIG, ROOT_LOGGER, ROOT_CONTAINER }
```

**Environment-Specific Initialization:**
- **API**: HTTP server with request-scoped containers
- **Worker**: Temporal worker with activity-scoped containers  
- **CLI**: Direct service access via singleton container

## Key Architectural Patterns

1. **Domain-Driven Design**: Services organized by business domain
2. **Schema-First Development**: TypeBox schemas drive API contracts
3. **Dependency Injection**: Comprehensive DI with Awilix
4. **Structured Logging**: Hierarchical Pino-based logging
5. **Rich IDs**: External-facing IDs with ULID for sortability
6. **Temporal Workflows**: Distributed job processing
7. **Configuration as Code**: Type-safe environment-driven config
8. **Error as Data**: Structured error handling with correlation

## Observations

- [detail] Central uses Fastify 5 as the web framework with TypeScript type providers for type-safe API development #central #fastify #web
- [technique] TypeBox schemas are used for all API contracts with automatic OpenAPI generation, never inline JSON Schema #central #api #typebox
- [technique] Rich ID system combines resource prefix with ULID for external-facing identifiers while using UUIDs internally #central #id
- [technique] Awilix dependency injection provides three container scopes: singleton, request, and activity #central #di #awilix
- [technique] Hierarchical logging with Pino where each service gets a child logger with component identification #central #logging #pino
- [technique] Database access uses separate read-only and read-write connections via Drizzle ORM #central #database #drizzle
- [technique] Temporal workflows handle distributed job processing across multiple worker queues (core, media, atproto, identity) #central #worker #temporal
- [technique] CLI built with cmd-ts provides type-safe command definitions with full dependency injection access #central #cli
- [technique] Unified bootstrap process shared across API, worker, and CLI with optional database migrations #central #bootstrap
- [decision] Schema-first approach ensures API contracts are defined before implementation and drive OpenAPI documentation #central #api
- [decision] Service constructor pattern always includes child logger with component name for consistent logging #central #logging
- [decision] Database service methods accept optional executor parameter for transaction support, defaulting to read-only #central #database
- [decision] Transaction methods are prefixed with TX_ to clearly indicate their encapsulated nature #central #database
- [concept] Rich IDs provide human-readable, sortable, globally unique identifiers for external API consumption #central #id

## Relations

- implements [[Microservices Architecture]]
- uses [[Fastify Web Framework]]
- uses [[TypeBox Schema System]]
- uses [[Awilix Dependency Injection]]
- uses [[Temporal Workflow Engine]]
- uses [[Drizzle ORM]]
- uses [[Pino Structured Logging]]
- integrates_with [[PostgreSQL Database]]
- integrates_with [[Redis Cache]]
- integrates_with [[Temporal Workflow Engine]]
- part_of [[Development Environment]]
- supports [[Worker Job Processing]]
- enables [[Type Safe Development]]