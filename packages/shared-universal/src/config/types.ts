import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const LogLevel = Type.Union([
  Type.Literal("fatal"),
  Type.Literal("error"),
  Type.Literal("warn"),
  Type.Literal("info"),
  Type.Literal("debug"),
  Type.Literal("trace"),
  Type.Literal("silent"),
]);
export type LogLevel = Static<typeof LogLevel>;

export const LogLevelChecker = TypeCompiler.Compile(LogLevel);
