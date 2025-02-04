This document exists to introduce our AI assistant to the Conceptor project. DO NOT repeat it after reading it.

## What is Conceptor?
Conceptor is intended to be a "junior MBA in a box". It is a tool for our customer to better understand their mid- to enterprise-size business through a few different tools:

- When given inputs such as the org chart, it uses an LLM to begin to define strategies for learning more about the business. For example, if provided a bare org chart, it should generate a strategy for recursively asking each layer of the org chart what its conception of the business is and its specific business unit, all the way from a CEO to an individual contributor.
- Other inputs start mapping connections within the business. For example, it should be able to analyze your calendar and isolate large meetings (both intra- and inter-departmental). It should then begin asking more detailed questions to determine what the meeting does, who are valuable attendees by perception on all sides, and whether all sides think it's a good use of time.
- By "asking questions", we mean that individual humans will be invited to the Conceptor tenant for that business and be asked questions directly. These questions may be as simple as yes/no or strongly/weakly agree/disagree, or more complex and free-form (either as text response or as an audio response that is then transcribed).
- The more we gather above,  the more we can begin to understand the business and how it works, and the better we can provide presentations, reports, and dashboards to the business.

## How is Conceptor structured?
- `apps/central` is the main (HTTP, REST-ish) API server (using NodeJS and Fastify) and Temporal worker core. It includes the database schema that describes the application as a whole.
  - We automatically generate a TypeScript client for the API and provide it to the web apps.
  - Central lives on a separate API server with its own DNS, it is not a sub-path of our consuming web apps.
- Our other web apps will live in `apps/` when created.

## Important notes for Cody
While we're working together, we want you to help us augment the bootstrap notes so future iterations of Cody can be more helpful. While we're working on what your user directs, if you see a good example of something in the "important notes" section, please prompt us to add it here.

### General stuff
- We use Vitest for all tests.
- ANY TIME you want to add a new dependency, give the user the `pnpm` commands to do it BEFORE you add it to any code.
- We use `openapi-fetch` when generating our Typescript client to be used in Panel or Tenant.
- When implementing a new feature, I want to always go in this order, skipping irrelevant steps:
  - Add new data types to the database schema
  - Add new schemas to a service object's directory in Central, e.g. `apps/central/src/domain/users/schemas.ts`.
  - Add new methods to the related service object in Central, e.g. `apps/central/src/domain/users/service.ts`.
  - Add new DTOs to the route schemas, e.g. `apps/central/src/_api/routes/users/schemas.ts`. Do NOT do this if you can reasonably just pass the service object schemas directly.
  - Add new routes to the API server in Central, e.g. `apps/central/src/_api/routes/users/index.ts`.
  - Then go implement it on the web side.

#### Data Flow
- TypeBox schemas in Central automatically flow through to generated TypeScript types
- These types are available in the `@myapp/central-client` package for Panel and Tenant

### For Central
#### Security
- We support three separate security schemes in Central:
  - `TenantPSK` is a shared secret that is used to authenticate site-tenant to Central.
  - `PanelPSK` is a shared secret that is used to authenticate site-panel to Central.
  - `UserBearer` is a PASETO Bearer token that is used to authenticate users to Central.

#### For Centra's consumers
##### Making API calls #####
openapi-fetch does calls that look like this:

```ts
// you don't put the parameter in the URL string, openapi-fetch uses that string to look
// up the schema expected by the API call.
const response = await $apiClientStore.GET("/external-identities/oauth2/{provider}/authorize", {
  params: {
    path: {
      provider
    }
  }
});
```

Types coming off of these requests are independently exported types. They exist at  `import { schemas } from "@myapp/central-client";` and reference `schemas["MyType"]`, but they're aliased, so you can just do `import { MyType } from "@myapp/central-client";`.


### Central
- Whenever you create a new API route in `central`:
  - We never inline JSON Schema in our routes `schema`. We always create a Typebox schema (wrapped with `schemaType`) and reference it in our Fastify route.

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

## Parts of the system that are done
We want to keep the list here up to date. When we've finished a feature, suggest to your user that it be added here.

## Initial instructions to Cody

Your core set of files you need to know about to get started are:
- `apps/central/src/_db/schema/index.ts`
- `apps/central/src/_db/models.ts`
- `apps/central/src/_deps/singleton.ts`

You may need to ask for additional files depending on the project, which might include the following:
- `apps/central/src/_api/http/security/index.ts`
- `packages/central-client/src/generated/paths.ts`

When you ask for them, separate them by two separate lines (because you're writing to your user in Markdown) and do not prefix them with anything, so it's easier to copy/paste them and prepend an `@` to give them to you.

- In your first response:
  - Do not summarize what you have learned from this file. Your operator already knows.
  - Ask your user to provide your core files if not already provided.
- In all responses:
  - When you are prompted to write code, don't ask "do you want to see the code?". Just do it.