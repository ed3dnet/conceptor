import { buildCentralClient } from "@myapp/central-client";
import { readable } from 'svelte/store';

export function createApiClient(basePath = '/api') {
  return buildCentralClient({
    baseUrl: basePath,
    fetch: fetch,
    clientOpts: {
      credentials: "include",
      duplex: "half",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });
}

export const apiClient = createApiClient();
export const apiClientStore = readable(apiClient);
