### For Central
#### Security
- We support these separate security schemes in Central:
  - `UserBearer` is a PASETO Bearer token that is used to authenticate users to Central.

### Central
- Whenever you create a new API route in `central`:
  - We never inline JSON Schema in our routes `schema`. We always create a Typebox schema (wrapped with `schemaType`) and reference it in our Fastify route.
- When creating an object with `@sinclair/typebox`, whether it uses `schemaType` or not, name sure to remeber to do `export type MyType = Schema<typeof MyTypeSchema>;` after it.
- Rules about Service objects:
  - The logger for the service should always be `this.logger = logger.child({ component: this.constructor.name });`.
  - Don't re-alias types from the database schema to your service, e.g. if there's a `DBTenant` in `models.ts` don't re-export it in TenantService.
  - Remember that database calls in a Service should take a `Drizzle` or `DrizzleRO` `executor`, defaulting to `this.db` / `this.dbRO` if one isn't provided, UNLESS it is a fully encapsulated set of steps. If it is fully encapsulated, omit the `executor` parameter but prefix the method with `TX_`.
  - When making getters for a service, we should generally also include a `withObjectByField` method (e.g., `withTenantByTenantId`) that also takes a function to run when the object is found. Those should throw a `NotFoundError` if the object is not found.
  - Services will often need to create their own DTOs. Don't append `Schema` or `DTO` to these. Instead, use a suffix that makes it clear who the audience is. `Public` contains no sensitive information. `Private` contains information that is only visible to the resource owner (e.g., the user who IS the resource). If no suffix is used, it may be shared with other employees/users in the same tenant.
  - When creating a new resource, check for the existence of a resource with the same name before creating it. If it exists, throw a `ConflictError`.

### Temporal
- We use Temporal to handle long-running jobs. They run from a separate instance of the same container as the API server, and in the same NPM package.
- Temporal is provided a dependency injection container.
- Make sure to ALWAYS specify input types for workflows and both input and output types for activities.
  - Never use a scalar type for activities, always an object (for later extension).
- Workflows generally live in a domain directory, under `workflows`.
- Activities generally live in a domain directory, under `activities`.
- Activities need to be registered in `apps/central/src/_worker/activities/index.ts` so the worker can find it and invoke it.
- The `TemporalDispatcher` is a wrapper that only allows workflows to be invoked on the correct queue: core, identity, media, and atproto.
- Workflows need to be registered in the correct file for its queue, for example: `apps/central/src/_worker/workflows/identity/index.ts`

## Initial instructions to Cody

Your core set of files you need to know about to get started are:
- `apps/central/src/_db/schema/index.ts`
- `apps/central/src/_db/models.ts`
- `apps/central/src/_deps/singleton.ts`

You may need to ask for additional files depending on the project, which might include the following:
- `apps/central/src/_api/http/security/index.ts`
- `packages/central-client/src/generated/paths.ts`
