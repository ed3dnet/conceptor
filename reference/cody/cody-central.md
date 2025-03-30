### For Central
#### Security
- We support these separate security schemes in Central:
  - `TenantUserCookie` is an opaque cookie that is set during the login flow. API calls on behalf of the tenant user will use this.
  - In the future we'll support API calls via service accounts, but not yet.

### Central
- Whenever you create a new API route in `central`:
  - New routes live in `apps/central/src/_api/routes`.
    - Create a directory (say, `foo`).
      - Routes live in `apps/central/src/_api/routes/foo/routes.ts`.
      - Request/response schemas live in `apps/central/src/_api/routes/foo/schemas.ts`.
    - The basic structure looks something like:

```ts
import fp from "fastify-plugin";

import { type AppFastify } from "../../http/type-providers.js";

import { PingResponse } from "./schemas.js";

async function metaRoutes(fastify: AppFastify) {
  fastify.get("/meta/liveness-probe", {
    schema: {
      response: {
        200: PingResponse,
      },
    },
    oas: {
      tags: ["meta"],
      security: [],
    },
    handler: async () => {
      return { pong: true } as const;
    },
  });
}

export const META_ROUTES = fp(metaRoutes, {
  name: "META_ROUTES",
  fastify: ">= 4",
});
```
  - The exported Fastify plugin will be added to `apps/central/src/routes/index.ts`, similar to:

```ts
async function apiRoutes(fastify: AppFastify) {
  // add new route plugins here
  await fastify.register(META_ROUTES);
}
```

  - We never inline JSON Schema in our routes `schema`. We always create a Typebox schema (wrapped with `schemaType`) and reference it in our Fastify route.
- When creating an object with `@sinclair/typebox`, whether it uses `schemaType` or not, name sure to remeber to do `export type MyType = Schema<typeof MyTypeSchema>;` after it.
- When designing API responses, never return bare arrays. Always put them in an object with a reasonably-named key, e.g. `{ authConnectors: [] }` for `GetTenantAuthConnectorsResponse`.
- Rules about Service objects:
  - The logger for the service should always be `this.logger = logger.child({ component: this.constructor.name });`.
  - Don't re-alias types from the database schema to your service, e.g. if there's a `DBTenant` in `models.ts` don't re-export it in TenantService.
  - Remember that database calls in a Service should take a `Drizzle` or `DrizzleRO` `executor`, defaulting to `this.db` / `this.dbRO` if one isn't provided, UNLESS it is a fully encapsulated set of steps. If it is fully encapsulated, omit the `executor` parameter but prefix the method with `TX_`.
  - When making getters for a service, we should generally also include a `withObjectByField` method (e.g., `withTenantByTenantId`) that also takes a function to run when the object is found. Those should throw a `NotFoundError` if the object is not found.
  - Services will often need to create their own DTOs. Don't append `Schema` or `DTO` to these. Instead, use a suffix that makes it clear who the audience is. `Public` contains no sensitive information. `Private` contains information that is only visible to the resource owner (e.g., the user who IS the resource). If no suffix is used, it may be shared with other users in the same tenant.
  - Any DTO that will end up in an API response needs a `__type` property that names the DTO, to help create type errors when objects not intended to be part of the API surface are returned by an API handler.
  - When creating a new resource, check for the existence of a resource with the same name before creating it. If it exists, throw a `ConflictError`.
  - Remember that our standard discriminated union key is `kind`, not `type`.
- All objects that are inputs to a service should have `Input` in the name. UNLIKE other data structures, we do NOT want `__type` in input structures, as that would suggest we're asking customers to do that and that's bad.
- All list endpoints should be using the list framework in `domain/shared/schemas/lists.ts`. This implies both a `ListXInput` and a `ListXInputOrCursor` input to those methods; the cursor object includes the original `ListXInput` as well as the necessary cursor properties. (Technical implementation: because of the way json schema and typescript work, you cannot `Type.Intersect` to `ListInputBase`, you must instead do `Type.Object({ ...ListInputBase.properties })`.)

### Rich IDs

We use "rich IDs" for all externally visible resource identifiers. These combine a resource-specific prefix with a ULID to create human-readable, sortable, and globally unique identifiers.

#### Structure and Implementation

- Rich IDs follow the format: `{prefix}-{ULID}` (e.g., `tenant-01H2XVNZ7C9NXWK3TMCRD9QWMN`)
- Each resource type has its own ID type and utilities:

```ts
// In domain/resource/id.ts
import { createRichIdUtils, type RichId } from "../../lib/utils/rich-id.js";

export type ResourceId = RichId<"resource">;
export const ResourceIds = createRichIdUtils("resource");
```

### Database Operations

If you need database table information, request that the user put `apps/central/src/_db/schema/index.ts` in the chat. This file contains the definitions for all database tables and is essential for understanding how to interact with the database. Also ask for `apps/central/src/_db/models.ts` for the database models.

- **ID Generation**: Let the database generate IDs - don't use `uuidv4()` or similar in application code. Our schema is set up with defaults.

- **Result Extraction**: Use array destructuring to get the first result from database operations:
  ```typescript
  const [dbItem] = await executor.insert(TABLE).values({...}).returning();
  if (!dbItem) {
    throw new Error("Failed to create item");
  }
  ```

- **Type-Specific ID Conversions**: Always use the appropriate ID utility for each entity type:
  ```typescript
  // Correct
  unitId: UnitIds.toUUID(unitId)
  
  // Incorrect
  unitId: AskIds.toUUID(unitId)
  ```

- **Count Queries**: Use Drizzle's count function with mapWith:
  ```typescript
  const [total] = await executor
    .select({ count: count().mapWith(Number) })
    .from(TABLE)
    .where(and(...conditions));
    
  if (!total) {
    throw new Error("Failed when counting items");
  }
  ```

- **Error Handling**: Always check for database operation failures and throw appropriate errors.

- **Query Conditions**: Build conditions arrays for complex queries and use `and(...conditions)` for combining them.

#### Usage Rules

1. **Type Definitions**:
   - Define resource-specific ID types in a dedicated `id.ts` file in the resource's domain directory
   - Name the type as singular `ResourceId` (e.g., `TenantId`, `AuthConnectorId`)
   - Export utility functions as plural `ResourceIds` (e.g., `TenantIds`, `AuthConnectorIds`)

2. **In Schemas**:
   - Use `ResourceIds.TRichId` for TypeBox schema definitions
   - Example: `tenantId: TenantIds.TRichId`

3. **In Services**:
   - Create separate methods for UUID and rich ID access patterns. UUID access methods should be private to the service.
   - Service public methods should ONLY take rich IDs as parameters, e.g. `tenantId: TenantId`.
   - Convert to UUID for database operations: `ResourceIds.toUUID(resourceId)`
   - Convert to rich ID for responses: `ResourceIds.toRichId(dbResource.resourceId)`
   - Create helper methods like `toPublicResource` that handle the conversion

4. **In API Routes**:
   - Accept string parameters in routes and validate with appropriate schemas
   - Let services handle the conversion between rich IDs and UUIDs

5. **Conversion Utilities**:
   - `ResourceIds.toRichId(id)`: Converts UUID or existing rich ID to a rich ID
   - `ResourceIds.toUUID(richId)`: Extracts the UUID from a rich ID
   - `ResourceIds.guard(value)`: Type guard to check if a string is a valid rich ID
   - `ResourceIds.ensure(value)`: assertion; throws an error if the value is not a valid rich ID

#### Example Implementation

```ts
// Private method for UUID access (internal use)
private async getByTenantUUID(
  uuid: StringUUIDType,
  executor: DrizzleRO = this.dbRO,
): Promise<DBTenant | null> {
  const tenant = await executor
    .select()
    .from(TENANTS)
    .where(eq(TENANTS.tenantId, uuid))
    .limit(1);

  return tenant[0] ?? null;
}

// Public method for rich ID access (external API)
async getByTenantId(
  tenantId: TenantId,
  executor: DrizzleRO = this.dbRO,
): Promise<TenantPublic | null> {
  const uuid = TenantIds.toUUID(tenantId);
  const tenant = await this.getByTenantUUID(uuid, executor);
  return tenant ? this.toPublicTenant(tenant) : null;
}

// Converting DB entity to public response
private toPublicTenant(dbTenant: DBTenant): TenantPublic {
  return {
    tenantId: TenantIds.toRichId(dbTenant.tenantId),
    slug: dbTenant.slug,
    displayName: dbTenant.displayName,
  };
}
```

### Service Development and Tenant Domains

Conceptor uses a tenant-scoped architecture where most services operate within the context of a specific tenant. This ensures proper multi-tenancy isolation and security. Understanding how to develop and use services within this architecture is essential.

#### Tenant Domain Architecture

Services in Conceptor fall into two categories:

1. **Global Services**: These operate across all tenants (e.g., `TenantService`, `EventService`)
2. **Tenant-Scoped Services**: These operate within a specific tenant's context (e.g., `UserService`, `UnitService`, `QuestionsService`)

The tenant domain container provides tenant-specific instances of services with proper isolation:

```typescript
// Getting a tenant-scoped service
const tenantDomain = await container.cradle.tenantDomain(tenantId);
const userService = tenantDomain.cradle.users;
```

#### Developing Tenant-Scoped Services

When creating a new tenant-scoped service:

1. **Constructor Pattern**: Always accept `tenantId` as the last parameter in the constructor:

```typescript
export class MyService {
  private readonly logger: Logger;
  private readonly tenantUuid: StringUUID;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly events: EventService,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({ 
      component: this.constructor.name,
      tenantId 
    });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }
}
```

2. **Database Queries**: Always filter by tenant ID in all database queries:

```typescript
const items = await executor
  .select()
  .from(MY_TABLE)
  .where(and(
    eq(MY_TABLE.tenantId, this.tenantUuid),
    // other conditions...
  ));
```

3. **Events**: Use the service's tenant ID when dispatching events:

```typescript
await this.events.dispatchEvent({
  __type: "MyEntityCreated",
  tenantId: this.tenantId,
  entityId: entityId,
  timestamp: new Date().toISOString(),
});
```

4. **Service Registration**: Register your service in `apps/central/src/_deps/tenant-scope.ts`:

```typescript
// In AppTenantScopeItems type
export type AppTenantScopeItems = {
  // ...existing services
  myService: MyService,
};

// In registrations object
myService: asFunction(
  ({ logger, db, dbRO, events }: TenantDomainItems) =>
    new MyService(logger, db, dbRO, events, tenantId),
),
```

#### Subservices Pattern

For complex domains, use the subservice pattern to organize functionality:

1. **Main Service**: Acts as a facade and lazy-loads subservices:

```typescript
export class ComplexService {
  private _subServiceA?: SubServiceA;
  private _subServiceB?: SubServiceB;

  constructor(
    logger: Logger,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
    private readonly events: EventService,
    readonly tenantId: TenantId,
  ) {
    this.logger = logger.child({ component: this.constructor.name, tenantId });
    this.tenantUuid = TenantIds.toUUID(tenantId);
  }

  get serviceA(): SubServiceA {
    if (!this._subServiceA) {
      this._subServiceA = new SubServiceA(
        this.logger,
        this.db,
        this.dbRO,
        this.events,
        this.tenantId
      );
    }
    return this._subServiceA;
  }

  get serviceB(): SubServiceB {
    if (!this._subServiceB) {
      this._subServiceB = new SubServiceB(
        this.logger,
        this.db,
        this.dbRO,
        this.events,
        this.tenantId
      );
    }
    return this._subServiceB;
  }
}
```

2. **Subservices**: Follow the same tenant-scoped pattern as regular services.

#### Using Tenant Domains in CLI Commands

CLI commands should use the tenant domain pattern to ensure proper tenant validation and isolation:

```typescript
export const myCommand = command({
  name: "my-command",
  args: {
    tenantId: option({
      type: string,
      long: "tenant-id",
      description: "The tenant ID",
    }),
    // other args...
  },
  handler: async ({ tenantId, ...otherArgs }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-my-command",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    // Get tenant domain to ensure tenant exists and for proper scoping
    const tenantDomain = await ROOT_CONTAINER.cradle.tenantDomain(
      TenantIds.ensure(tenantId)
    );

    // Use tenant-scoped services
    const result = await tenantDomain.cradle.myService.doSomething(...);

    ROOT_LOGGER.info({ tenantId, ...result }, "Command completed");
    process.exit(0);
  },
});
```

#### Dependency Injection and Service Lifecycle

Conceptor uses Awilix for dependency injection with three container scopes:

1. **Singleton Scope**: Global services and resources (defined in `singleton.ts`)
2. **Tenant Scope**: Tenant-specific services (defined in `tenant-scope.ts`)
3. **Request Scope**: HTTP request-specific resources (defined in `request.ts`)

Services are instantiated lazily when first accessed and follow these lifecycle rules:

- **Singleton Services**: Created once and shared across the application
- **Tenant Services**: Created once per tenant and shared across requests for that tenant
- **Request Services**: Created for each HTTP request

When developing services, consider which scope is appropriate based on the service's responsibilities and state management needs.


### Temporal
- We use Temporal to handle long-running jobs. They run from a separate instance of the same container as the API server, and in the same NPM package.
- Temporal is provided a dependency injection container.
- Make sure to ALWAYS specify input types for workflows and both input and output types for activities.
  - Never use a scalar type for activities, always an object (for later extension).
- Workflows generally live in a domain directory, under `workflows`.
- Activities generally live in a domain directory, under `activities`.
- Activities need to be registered in `apps/central/src/_worker/activities/index.ts` so the worker can find it and invoke it.
- The `TemporalDispatcher` is a wrapper that only allows workflows to be invoked on the correct queue: core and media.
- Workflows need to be registered in the correct file for its queue, for example: `apps/central/src/_worker/workflows/identity/index.ts`

## Postgres
When you need to dynamically build an update statement, you will want something like this from `@drizzle-orm/pg-core`:

```ts
const updateData: PgUpdateSetSource<typeof TRANSCRIPTION_JOBS> = {
  status: input.status,
};
```

## Initial instructions to Cody

Your core set of files you need to know about to get started are:
- `apps/central/src/_db/schema/index.ts`
- `apps/central/src/_db/models.ts`
- `apps/central/src/_deps/singleton.ts`

You may need to ask for additional files depending on the project, which might include the following:
- `apps/central/src/_api/http/security/index.ts`
- `packages/central-client/src/generated/paths.ts`

DO NOT ATTEMPT TO DO ENTIRE REQUESTED PROBLEMS IN A SINGLE SHOT. We'll work in steps small enough for me to think through. Wait for me to confirm after a logical part of the system (for example, after we have finished defining our object types) before continuing to the next logical part.