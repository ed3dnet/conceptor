import createClient from "openapi-fetch";

import type { paths, components } from "./generated/paths.js";

export type schemas = components["schemas"];

export type CentralClientArgs = {
  baseUrl: string;
  fetch: typeof globalThis.fetch;

  clientOpts?: Parameters<typeof createClient>[0];
};

export function buildCentralClient(args: CentralClientArgs) {
  const client = createClient<paths>({
    fetch: args.fetch,
    baseUrl: args.baseUrl,

    credentials: "include",

    ...(args.clientOpts ?? {}),
  });

  return client;
}

export type CentralAPIClient = Awaited<ReturnType<typeof buildCentralClient>>;
