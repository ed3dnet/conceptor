// Create a configured instance of the API client

import { buildCentralClient } from "@myapp/central-client";

// We'll use environment variables for the base URL to support different environments
const BASE_URL = "/api";

export const centralApiClient = buildCentralClient({
  fetch: globalThis.fetch,
  baseUrl: BASE_URL,

  clientOpts: {},
});
