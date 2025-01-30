import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { AppConfig, LogLevel } from "../../_config/types.js";

export const WorkerAppConfig = Type.Intersect([AppConfig, Type.Object({})]);
export type WorkerAppConfig = Static<typeof WorkerAppConfig>;
export const ApiAppConfigChecker = TypeCompiler.Compile(WorkerAppConfig);
