import { type TSchema } from "@sinclair/typebox";
import Ajv, { type ValidateFunction } from "ajv";
import addErrors from "ajv-errors";
import addFormats from "ajv-formats";

export const AJV = new Ajv.default({
  allErrors: true,
  coerceTypes: true,
  useDefaults: true,
  removeAdditional: true,
  verbose: true,
  strict: false,
})
  .addKeyword("kind")
  .addKeyword("modifier")
  .addKeyword("x-fastify-schemaName");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
addFormats.default(AJV as any, ["email", "time", "uri"]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
addErrors.default(AJV as any);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VALIDATORS: Map<TSchema, ValidateFunction<any>> = new Map();
export function getAjvValidator<T extends TSchema>(
  schema: T,
): ValidateFunction<T> {
  let ret = VALIDATORS.get(schema);
  if (!ret) {
    ret = AJV.compile(schema);
  }

  return ret!;
}
