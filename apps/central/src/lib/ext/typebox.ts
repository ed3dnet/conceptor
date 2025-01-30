import { schemaType } from "@eropple/fastify-openapi3";
import {
  Type,
  type Static,
  type TSchema,
  type SchemaOptions,
  type Assert,
} from "@sinclair/typebox";

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
    pattern:
      "^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:?\\d{2})?)?$",
  }),
);
export type ISODateTime = Static<typeof ISODateTime>;

export const StringUUID = schemaType(
  "StringUUID",
  Type.String({
    pattern:
      "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
  }),
);
export type StringUUID = Static<typeof StringUUID>;

export const StringDomainName = schemaType(
  "StringDomainName",
  Type.String({
    pattern:
      "^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*.[a-zA-Z]{2,}$",
  }),
);
export type StringDomainName = Static<typeof StringDomainName>;
