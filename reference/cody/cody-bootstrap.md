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
- `apps/panel` is the primary web app that consumes Central for users to interact with.

## Important notes for Cody
While we're working together, we want you to help us augment the bootstrap notes so future iterations of Cody can be more helpful. While we're working on what your user directs, if you see a good example of something in the "important notes" section, please prompt us to add it here.

DO NOT ATTEMPT TO DO ENTIRE REQUESTED PROBLEMS IN A SINGLE SHOT. We'll work in steps small enough for me to think through. Wait for me to confirm after a logical part of the system (for example, after we have finished defining our object types) before continuing to the next logical part.

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
- We always prefer `spine-case` for filenames.

#### Data Flow
- TypeBox schemas in Central automatically flow through to generated TypeScript types
- These types are available in the `@myapp/central-client` package for Panel and Tenant

## See also

- If you're working on the API server, look up or request `reference/cody/cody-central.md`.
- If you're working on the web app, look up or request `reference/cody/cody-panel.md`.
- If you're working on the local dev environment (Tilt, etc.), look up or request `reference/cody/cody-devenv.md`.