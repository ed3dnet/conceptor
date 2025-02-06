import type { CentralAPIClient } from "@myapp/central-client";
import type { FetchFn } from "@myapp/shared-universal/utils/fetch.js";
import type { Logger } from "pino";

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
       * because we contractually guarantee that anywhere inside a tenant path it should exist. The one
       * place where you may be optionally logged in is `/login` or `/logout`, which should specifically
       * check truthiness of this client.
       */
      readonly serverUserApiClient: CentralAPIClient;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
