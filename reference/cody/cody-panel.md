`panel` is our web app. It's a React app that consumes the API server, Central.

This application is a React application built on top of Vite and using Tailwind CSS. It uses ShadCN for UI components and TanStack Router for client-side routing.

#### Misc Notes ####
- we're using React Fast Refresh, so we need to be careful about how we export symbols.
  - contexts live in `src/contexts`
  - the hooks that use those contexts live in `src/hooks`

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

##### When You See This File #####

Make sure to request the following files:

- `packages/central-client/src/generated/paths.ts`
- `packages/central-client/src/generated/schemas.ts`
- `packages/central-client/src/generated/types.ts`
