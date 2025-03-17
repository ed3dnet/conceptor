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

## Initial instructions to Cody

Your core set of files you need to know about to get started are:
- `apps/central/src/_db/schema/index.ts`
- `apps/central/src/_db/models.ts`
- `apps/central/src/_deps/singleton.ts`

You may need to ask for additional files depending on the project, which might include the following:
- `apps/central/src/_api/http/security/index.ts`
- `packages/central-client/src/generated/paths.ts`

DO NOT ATTEMPT TO DO ENTIRE REQUESTED PROBLEMS IN A SINGLE SHOT. We'll work in steps small enough for me to think through. Wait for me to confirm after a logical part of the system (for example, after we have finished defining our object types) before continuing to the next logical part.