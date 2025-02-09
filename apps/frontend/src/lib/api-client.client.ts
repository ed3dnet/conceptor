import { buildCentralClient } from "@myapp/central-client";

export const apiClient = buildCentralClient({
  baseUrl: "/api",
  // eslint-disable-next-line no-restricted-globals
  fetch: fetch,
  clientOpts: {
    credentials: "include",
    duplex: "half",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
});
