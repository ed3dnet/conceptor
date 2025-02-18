import { type CentralAPIClient } from "@myapp/central-client";
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen.ts";

// Define our router context type
export interface RouterContext {
  central: CentralAPIClient
}

export const router = createRouter({
  routeTree,
  context: {

    central: null as unknown as CentralAPIClient, // We'll inject this properly in main.tsx
  },
});

// Type the router for use throughout the app
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
