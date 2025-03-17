import type { Logger } from "pino";

import type {  AppConfig } from "./lib/config/types.js";
import type { CentralAPIClient } from "../../../packages/central-client/src/client.js";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
    interface Locals {
      readonly fetch: FetchFn;
      readonly config: AppConfig;
      readonly logger: Logger;
      /**
       * The API client for the central site, in the user context. This is not listed as `| null`
       * because we contractually guarantee that anywhere on `/panel` it should exist. The one
       * place where you may be optionally logged in is `/login` or `/logout`, which should specifically
       * check truthiness of this client.
       */
      readonly serverUserApiClient: CentralAPIClient;
      readonly globalApiClient: CentralAPIClient;
    }
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
