import { LogLevel } from "@myapp/shared-universal/config/types.js";
import { type Static, Type } from "@sinclair/typebox";

import type { FRONTEND_BASE_URL } from "$env/static/private";

export { LogLevel };

export const HttpConfig = Type.Object({
  port: Type.Number(),
  logLevel: LogLevel,
});
export type HttpConfig = Static<typeof HttpConfig>;

export const UrlsConfig = Type.Object({
  apiBaseUrl: Type.String({ format: "uri" }),
  frontendBaseUrl: Type.String({ format: "uri" }),
});
export type UrlsConfig = Static<typeof UrlsConfig>;

export const InsecureOptionsConfig = Type.Object({
  insecureCookies: Type.Boolean(),
});
export type InsecureOptionsConfig = Static<typeof InsecureOptionsConfig>;

export const InteropConfig = Type.Object({
  authCookieName: Type.String(),
});
export type InteropConfig = Static<typeof InteropConfig>;

export const AppConfig = Type.Object({
  env: Type.String(),
  logLevel: LogLevel,
  prettyLogs: Type.Boolean(),
  http: HttpConfig,
  urls: UrlsConfig,
  interop: InteropConfig,
  insecure: InsecureOptionsConfig,
});
export type AppConfig = Static<typeof AppConfig>;
