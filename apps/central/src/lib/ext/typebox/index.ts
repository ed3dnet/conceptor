import type { randomUUID } from "node:crypto";

import { schemaType } from "@eropple/fastify-openapi3";
import {
  Type,
  type Static,
  type TSchema,
  type SchemaOptions,
  type Assert,
} from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { applyFormatsToRegistry } from "./formats/index.js";

applyFormatsToRegistry();

export type TUnionOneOf<T extends TSchema[]> = T extends [infer L, ...infer R]
  ? Static<Assert<L, TSchema>> | TUnionOneOf<Assert<R, TSchema[]>>
  : never;

export const UnionOneOf = <T extends TSchema[]>(
  oneOf: [...T],
  options: SchemaOptions = {},
) => Type.Unsafe<TUnionOneOf<T>>({ ...options, oneOf });

export function IntegerEnum<T extends number[]>(
  values: [...T],
  options: SchemaOptions = {},
) {
  return Type.Unsafe<T[number]>({ ...options, type: "integer", enum: values });
}

export function StringEnum<T extends string[]>(values: [...T]) {
  return Type.Unsafe<T[number]>({ ...Type.String(), enum: values });
}

export const ISODateTime = schemaType(
  "ISODateTime",
  Type.String({
    format: "date-time",
    pattern:
      "^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:?\\d{2})?)?$",
  }),
);
export type ISODateTime = Static<typeof ISODateTime>;

export type StringUUIDType = ReturnType<typeof randomUUID>;
export const StringUUID = schemaType(
  "StringUUID",
  Type.Unsafe<StringUUIDType>({
    ...Type.String({
      format: "uuid",
      pattern:
        "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
    }),
  }),
);
export type StringUUID = Static<typeof StringUUID>;
export const StringUUIDChecker = TypeCompiler.Compile(StringUUID);

export const StringULIDPattern = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
export const StringULID = schemaType(
  "StringULID",
  Type.String({
    pattern: StringULIDPattern.source,
  }),
);
export type StringULID = Static<typeof StringULID>;
export const StringULIDChecker = TypeCompiler.Compile(StringULID);

export const StringDomainName = schemaType(
  "StringDomainName",
  Type.String({
    pattern:
      "^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*.[a-zA-Z]{2,}$",
  }),
);
export type StringDomainName = Static<typeof StringDomainName>;
