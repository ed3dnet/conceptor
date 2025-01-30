import ms from "ms";
import * as GetEnv from "node-getenv";

export const ENV_PREFIX = "CENTRAL";

export function prefixEnvVar(varName: string): string {
  return `${ENV_PREFIX}_${varName}`;
}

export function getNodeEnv(): string {
  return GetEnv.requireStr("NODE_ENV");
}

export function requireStr(varName: string): string {
  return GetEnv.requireStr(prefixEnvVar(varName));
}

export function requireJson<T>(varName: string): T {
  return JSON.parse(requireStr(varName));
}

export function getStr(varName: string, defaultValue: string): string {
  return GetEnv.getStr(prefixEnvVar(varName), defaultValue);
}

export function requireStrList(
  varName: string,
  delimiter: string = ",",
  allowEmpty: boolean = false,
): string[] {
  const raw = requireStr(varName);

  if (!allowEmpty && raw.trim() === "") {
    throw new Error(`${prefixEnvVar(varName)} must not be empty`);
  }

  const result = raw.split(delimiter);
  return result;
}

export function getBool(varName: string, defaultValue: boolean): boolean {
  return GetEnv.getBool(prefixEnvVar(varName), defaultValue);
}

export function getNum(varName: string, defaultValue: number): number {
  return GetEnv.getNum(prefixEnvVar(varName), defaultValue);
}

export function requireNum(varName: string): number {
  return GetEnv.requireNum(prefixEnvVar(varName));
}

export function requireBool(varName: string): boolean {
  return GetEnv.requireBool(prefixEnvVar(varName));
}

export function getMilliseconds(varName: string, defaultValue: string): number {
  return ms(GetEnv.getStr(prefixEnvVar(varName), defaultValue));
}
export function requireMilliseconds(varName: string): number {
  return ms(GetEnv.requireStr(prefixEnvVar(varName)));
}
