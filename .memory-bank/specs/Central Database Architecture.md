---
title: Central Database Architecture
type: note
permalink: specs/central-database-architecture
tags:
- central
- database
- drizzle
- postgresql
- migrations
- seeding
- di
- logging
- transactions
- schema
- id
- typescript
---

# Central Database Architecture

## Executive Summary

Central implements a sophisticated **read/write separation architecture** using Drizzle ORM with PostgreSQL, featuring comprehensive dependency injection, type-safe migrations, and a robust seeding system. The database layer follows **strict patterns for transaction handling, rich ID management, and security**.

## Database Configuration & Connection Architecture

### Dual Connection Strategy

**Configuration Pattern:**
```typescript
PostgresConfig = {
  readonly: PostgresHostConfig,    // Read-only operations
  readwrite: PostgresHostConfig    // Write operations + transactions
}
```

**Connection Pool Management:**
- **Separate connection pools** for read-only and read-write operations
- **Environment-driven configuration** via TypeBox schemas
- **SSL support** with configurable connection parameters
- **Pool sizing** (default: 5 connections per pool)
- **Application naming** for connection identification (`pg_readonly`, `pg_readwrite`)

### Dependency Injection Integration

**Container Registration:**
```typescript
// Pools registered as singletons
dbROPool: asFunction(({ config, logger }) => 
  buildDbPoolFromConfig("readonly", logger, config.postgres.readonly)
).singleton(),

dbPool: asFunction(({ config, logger }) => 
  buildDbPoolFromConfig("readwrite", logger, config.postgres.readwrite)  
).singleton(),

// Drizzle instances with integrated logging
dbRO: asFunction(({ logger, config, dbROPool }) => 
  drizzle(dbROPool, {
    logger: buildDrizzleLogger(logger.child({ component: "drizzle-ro" })),
    casing: "snake_case"
  })
),

db: asFunction(({ logger, config, dbPool }) => 
  drizzle(dbPool, {
    logger: buildDrizzleLogger(logger.child({ component: "drizzle" })),
    casing: "snake_case"
  })
)
```

## Type System & ORM Architecture

### Drizzle Type Separation

**Core Types:**
```typescript
type Drizzle = Omit<ReturnType<typeof drizzle>, "$client">
type DrizzleMutableMethods = "insert" | "update" | "delete"
type DrizzleRO = Omit<Drizzle, DrizzleMutableMethods>  // Read-only operations only

// Executor types for transaction support
type Executor = Pick<Drizzle, "insert" | "update" | "delete" | "select">
type ExecutorRO = Pick<DrizzleRO, "select">
```

**Key Design Principles:**
- **DrizzleRO** prevents write operations at compile time
- **Executor pattern** allows services to accept optional database connections for transactions
- **Type safety** enforced through TypeScript, not runtime checks

### Rich ID System Integration

**UUID-ULID Hybrid Pattern:**
```typescript
// Database helper for automatic ULID-as-UUID generation
const ULIDAsUUID = (columnName?: string) =>
  uuid(columnName)
    .$default(() => ulidToUUID(ulid()))
    .$type<StringUUID>()

// Usage in schema definitions
export const TENANTS = pgTable("tenants", {
  tenantId: ULIDAsUUID().primaryKey(),
  // ...
});
```

**Rich ID Management:**
- **Internal storage**: UUIDs in database for performance
- **External exposure**: Rich IDs (`tenant-01H2XVNZ7C9NXWK3TMCRD9QWMN`)
- **Automatic conversion** in service methods
- **Type-safe helpers** for conversion between formats

## Schema Architecture

### Schema Organization Pattern

**File Structure:**
```
_db/
├── schema/
│   ├── index.ts      # Main table definitions
│   └── app-meta.ts   # System metadata (seeds, etc.)
├── models.ts         # TypeScript type exports
└── seeds/           # Environment-specific seed data
    ├── development/
    └── production/
```

**Table Design Patterns:**

**Standard Mixins:**
```typescript
// Timestamp tracking on all entities
const TIMESTAMPS_MIXIN = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdateFn(() => new Date())
}

// S3 object location tracking
const S3_LOCATOR_MIXIN = {
  bucket: text("bucket").notNull(),
  objectName: text("object_name").notNull()
}
```

**Rich Schema Features:**
- **PostgreSQL enums** for constrained values
- **JSONB columns** for flexible data with TypeScript typing
- **Composite indexes** for query optimization
- **Check constraints** for data validation
- **Foreign key relationships** with proper cascading

## Migration System

### Migration Configuration

**Drizzle Kit Integration:**
```javascript
// drizzle.config.js
export default defineConfig({
  schema: ["./src/_db/schema/index.ts", "./src/_db/schema/app-meta.ts"],
  dialect: "postgresql", 
  out: "./db/migrations",
  dbCredentials: { url: buildPostgresConnectionString(envVars) },
  casing: "snake_case",
  strict: getNodeEnv() !== "development"  // Production strictness
})
```

**Migration Workflow:**
```bash
# Generate migration from schema changes
pnpm pg:generate --name migration_name

# Apply migrations via CLI
pnpm cli:dev db migrate

# Automatic migration on startup (configurable)
bootstrapNode(name, config, { skipMigrations: false })
```

**Migration Execution:**
- **Automatic discovery** of migration directory via `findUpSync`
- **Bootstrap integration** - migrations run during app startup
- **Environment-aware** - can skip in development
- **Dependency injection** - full access to services during migration

## Seeding System

### Seed Architecture

**File-Based Seed Management:**
- **Environment-specific** seeds (`development/`, `production/`)
- **Ordered execution** via filename sorting
- **Immutability enforcement** via SHA256 hashing
- **Dependency injection** - full service access in seed functions

**Seed Structure:**
```typescript
// Seed function signature
type SeedFn = (deps: AppSingletonCradle, logger: Logger) => Promise<void>

// Example seed file
export const seed: SeedFn = async (deps, logger) => {
  const tenant = await deps.tenants.TX_createTenant({
    tenantId: TenantIds.toRichId("00000000-0000-0000-0000-000000000000"),
    slug: "technova", 
    displayName: "TechNova Global"
  })
  // ...
}
```

**Seed Safety Features:**
- **Idempotency** - seeds tracked in database to prevent re-runs
- **Hash verification** - prevents accidental changes to applied seeds
- **Production naming** - production seeds must have `PROD` prefix
- **Atomic execution** - each seed runs in isolation

### Seed Execution Flow

1. **Discovery**: Scan environment-specific directory for `.ts` files
2. **Verification**: Compare existing seeds with database records
3. **Validation**: Check naming conventions and hash integrity
4. **Execution**: Run new seeds with full dependency injection
5. **Tracking**: Record seed metadata in `SEEDS` table

## Service Integration Patterns

### Database Service Constructor Pattern

**Standard Service Structure:**
```typescript
export class TenantService {
  private readonly logger: Logger;
  
  constructor(
    logger: Logger,
    private readonly db: Drizzle,      // Write operations
    private readonly dbRO: DrizzleRO,  // Read operations  
  ) {
    this.logger = logger.child({ component: this.constructor.name });
  }
}
```

### Method Patterns

**Read Operations (Default to Read-Only):**
```typescript
async getByTenantId(
  tenantId: TenantId,
  executor: DrizzleRO = this.dbRO,  // Default to read-only
): Promise<TenantPublic | null> {
  const uuid = TenantIds.toUUID(tenantId);
  const tenant = await this.getByUUID(uuid, executor);
  return tenant ? this.toPublicTenant(tenant) : null;
}
```

**Write Operations (Require Write Connection):**
```typescript
async setUserTag(
  userId: UserId,
  key: string, 
  value: string,
  executor: Drizzle = this.db,  // Default to read-write
): Promise<void> {
  await executor.insert(USER_TAGS).values({
    userId: UserIds.toUUID(userId),
    key,
    value
  });
}
```

**Transaction Methods (TX_ Prefix):**
```typescript
// Encapsulated transaction - no executor parameter
async TX_createTenant(input: CreateTenantInput): Promise<TenantPrivate> {
  return await this.db.transaction(async (tx) => {
    const tenant = await tx.insert(TENANTS).values({
      tenantId: TenantIds.toUUID(input.tenantId),
      slug: input.slug,
      displayName: input.displayName
    }).returning();
    
    // Additional related operations...
    return this.toPrivateTenant(tenant[0]);
  });
}
```

### Executor Pattern Benefits

**Flexible Transaction Support:**
- **Default behavior**: Methods use appropriate connection (`dbRO` or `db`)
- **Transaction injection**: Pass transaction context as `executor`
- **Mixed operations**: Combine reads and writes in single transaction
- **Testing support**: Inject mock executors for unit testing

**Example Transaction Usage:**
```typescript
await this.db.transaction(async (tx) => {
  const user = await userService.getByUserId(userId, tx);     // tx used for read
  await userService.updateUser(userId, updates, tx);          // tx used for write  
  await auditService.logChange(userId, "updated", tx);        // tx used for audit
});
```

## Query Logging & Observability

### Integrated Logging System

**Drizzle Logger Integration:**
```typescript
class PinoDrizzleLogWriter implements LogWriter {
  constructor(private readonly logger: Logger) {}
  
  write(message: string): void {
    this.logger.debug(message);  // SQL queries logged at debug level
  }
}
```

**Logging Features:**
- **Structured logging** - SQL queries include execution time, parameters
- **Component-based** - separate loggers for read-only vs read-write
- **Environment-aware** - different log levels per environment
- **Request correlation** - queries tied to request context

## Security & Data Protection

### Sensitive Data Handling

**Vault Integration:**
```typescript
// Sensitive data encrypted before storage
idpUserInfo: jsonb("idp_user_info").$type<Sensitive<IdPUserInfo>>(),
state: jsonb("state").$type<Sensitive<OIDCConnectorState>>().notNull(),
```

**Security Patterns:**
- **Encrypted JSONB** for sensitive configuration
- **Connection string** encoding for special characters
- **SSL enforcement** in production configurations
- **Separate credentials** for read vs write operations

## Best Practices & Design Decisions

### Architectural Decisions

1. **Read/Write Separation**: Improves performance and enables read replicas
2. **Rich ID System**: Better API ergonomics while maintaining database performance  
3. **Type-Safe Migrations**: Compile-time validation of schema changes
4. **Immutable Seeds**: Prevents accidental data corruption in deployed environments
5. **Transaction Encapsulation**: `TX_` prefix clearly indicates atomic operations
6. **Executor Pattern**: Flexible transaction support without breaking encapsulation

### Performance Considerations

- **Connection pooling** prevents connection exhaustion
- **Prepared statements** via Drizzle for query optimization  
- **Index optimization** on foreign keys and query patterns
- **JSONB indexing** for flexible queries on semi-structured data
- **Snake case conversion** for PostgreSQL naming conventions

### Operational Excellence

- **Environment-specific configuration** for different deployment contexts
- **Structured logging** for debugging and monitoring
- **Health check integration** via connection pool monitoring
- **Graceful shutdown** with connection pool disposal

## Observations

- [detail] Central uses dual connection pools for read-only and read-write database operations with separate configuration #central #database #drizzle
- [technique] Drizzle ORM integration with TypeScript types that prevent write operations on read-only connections at compile time #central #database #drizzle #typescript
- [technique] Rich ID system stores UUIDs internally while exposing ULID-based external identifiers for better API ergonomics #central #database #id
- [technique] Database service constructor pattern injects both Drizzle and DrizzleRO instances with component-based logging #central #database #di #logging
- [technique] Executor pattern allows services to accept optional database connections for flexible transaction support #central #database #transactions
- [technique] Transaction methods use TX_ prefix to clearly indicate encapsulated atomic operations #central #database #transactions
- [technique] Migration system uses Drizzle Kit with automatic discovery and bootstrap integration #central #database #migrations #tooling
- [technique] Seeding system provides environment-specific data loading with SHA256 hash verification and immutability enforcement #central #database #seeding
- [technique] Schema organization uses mixins for common patterns like timestamps and S3 locators #central #database #schema
- [technique] Query logging integrates Drizzle with Pino structured logging for observability #central #database #logging
- [decision] Read/write connection separation enables performance optimization and read replica support #central #database
- [decision] Type-safe migrations prevent runtime schema errors through compile-time validation #central #database #migrations
- [decision] Immutable seeds with hash verification prevent accidental data corruption in production environments #central #database #seeding
- [concept] Executor pattern provides flexible transaction support while maintaining service encapsulation and testability #central #database #transactions

## Relations

- implements [[Database Layer Architecture]]
- uses [[Drizzle ORM]]
- uses [[PostgreSQL Database]]
- integrates_with [[Awilix Dependency Injection]]
- integrates_with [[Pino Structured Logging]]
- supports [[Rich ID System]]
- enables [[Type Safe Development]]
- part_of [[Central Project Architecture]]
- requires [[Environment Configuration]]
- supports [[Database Migrations]]
- supports [[Data Seeding]]