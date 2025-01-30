import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { AppConfig, LogLevel } from "../../_config/types.js";

import { HttpConfig } from "./http-types.js";

export const InteropConfig = Type.Object({
  tenantPreSharedKey: Type.String(),
  panelPreSharedKey: Type.String(),
});
export type InteropConfig = Static<typeof InteropConfig>;

export const ApiAppConfig = Type.Intersect([
  AppConfig,
  Type.Object({
    http: HttpConfig,
    interop: InteropConfig,
  }),
]);
export type ApiAppConfig = Static<typeof ApiAppConfig>;
export const ApiAppConfigChecker = TypeCompiler.Compile(ApiAppConfig);
