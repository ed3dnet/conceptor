`panel` is our web app. It's a SvelteKit app that consumes the API server, Central.

This uses Svelte 5 idioms and TypeScript. Do not use Svelte 4/legacy mode.

#### General application structure ####
We expect all users of the application to hit a first-level subdirectory, which uses the name of their tenant. For example, if your tenant is called "acme", you would visit `https://conceptor.example.com/acme`. If this doesn't exist, it should return a not-found page.

At this point (in a layout), we will call the API server to get the TenantPublic for this tenant and store it for downstream use. We will also make a whoami call to figure out the user's identity. This call can fail if they've never logged in. We should redirect to a login page, passing along the current URL as a later redirect parameter. On the login page we can request the tenant's authconnectors and allow them to click on which one they want to use. That will go to the API server and, on the way back (assuming they've successfully logged in, which sets a HttpOnly cookie that our app can't see), we will redirect back to the original URL and they should pass the auth gate and start using the application.

From here, the app proceeds as usual.

#### Misc Notes ####
Remember that we're using Svelte 5. This means stuff like:

```ts
  import { page } from '$app/state';
```

#### Making API calls ####
openapi-fetch does calls that look like this:

```ts
// you don't put the parameter in the URL string, openapi-fetch uses that string to look
// up the schema expected by the API call.
const response = await centralApiClient.GET("/external-identities/oauth2/{provider}/authorize", {
  params: {
    path: {
      provider
    }
  }
});
```

In server contexts (loaders), generally we should be using `locals.serverUserApiClient` to make
calls. We create this during `handle` and it encodes the user's auth token in a cookie header. In
client contexts, we TBD.

DO NOT attempt to use string interpolation for these URLs; they should provide a URL template via `params.path`.

Types coming off of these requests are independently exported types. They exist at  `import { schemas } from "@myapp/central-client";` and reference `schemas["MyType"]`, but they're aliased, so you can just do `import { MyType } from "@myapp/central-client";`.

##### When You See This File #####

Make sure to request the following files:

- `packages/central-client/src/generated/paths.ts`
- `packages/central-client/src/generated/schemas.ts`
- `packages/central-client/src/generated/types.ts`
