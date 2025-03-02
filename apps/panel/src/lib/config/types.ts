import { LogLevel } from "@myapp/shared-universal/config/types.js";
import { type Static, Type } from "@sinclair/typebox";

export { LogLevel };

export const HttpConfig = Type.Object({
  port: Type.Number(),
  logLevel: LogLevel,
  fetchLogLevel: LogLevel,
});
export type HttpConfig = Static<typeof HttpConfig>;

export const UrlsConfig = Type.Object({
  apiBaseUrl: Type.String({ format: "uri" }),
  panelBaseUrl: Type.String({ format: "uri" }),
});
export type UrlsConfig = Static<typeof UrlsConfig>;

export const InteropConfig = Type.Object({
  preSharedKey: Type.String(),
  sessionCookieName: Type.String(),
});
export type InteropConfig = Static<typeof InteropConfig>;

export const InsecureOptionsConfig = Type.Object({
  insecureCookies: Type.Boolean(),
});
export type InsecureOptionsConfig = Static<typeof InsecureOptionsConfig>;

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
