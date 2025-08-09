This file exists to orient the model on the various apps and packages in the repository.

- `central`: `apps/central`
  - the core business logic server for the project
  - written in TypeScript with Fastify
  - includes REST APIs and Temporal asynchronous workflows
- `central-client`: `packages/central-client`
  - auto-generated from `central`'s OpenAPI specifications for `panel` to make calls
- `panel`: `apps/panel`
  - the web interface for the project
  - written in TypeScript with React and React Router
- `shared-universal`: `packages/shared-universal`
  - code shared between multiple projects
  - platform-agnostic, all code runs on both browser and Node
`_dev-env`: `_dev-env`
  - scripts, dev kubernetes manifests, etc. for running the entire project on a local development machine.
