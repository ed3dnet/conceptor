import { BadRequestError } from "@myapp/shared-universal/errors/index.js";
import { type Static, type TObject, Type } from "@sinclair/typebox";
import { TypeCheck } from "@sinclair/typebox/compiler";

export type ListCursorOptions = {
  maxItems?: number;
};

/**
 * Technical implementation: because of the way json schema and typescript
 * work, you cannot `Type.Intersect` to `ListInputBase`, you must instead do
 * `Type.Object({ ...ListInputBase.properties })`. in your objects.
 */
export const ListInputBase = Type.Object({
  limit: Type.Integer({
    description: "max number of items to return",
    minimum: 1,
    maximum: 1000,
  }),
  offset: Type.Integer({
    description: "number of items to skip",
    minimum: 0,
  }),
});
export type ListInputBase = Static<typeof ListInputBase>;

// this should never be exposed bare to a user, and should always be stringified
// and then base64'd.
export function buildListCursorSchema<TListInput extends typeof ListInputBase>(
  listInputSchema: TListInput,
  options: ListCursorOptions = {},
) {
  // 'r' is the original request that came in that generated this list call.
  // we re-run the original request, but with the cursor's offset, and
  // we do not return data newer than the cursor's timestamp.
  return Type.Object({
    r: listInputSchema,
    t: Type.String({
      description: "timestamp of the cursor",
      format: "date-time",
    }),
    o: Type.Integer({
      description:
        "offset of the cursor, using the original request's limit and the timestamp in 't'",
    }),
  });
}
export type ListCursorSchema<TListInput extends typeof ListInputBase> = Static<
  ReturnType<typeof buildListCursorSchema<TListInput>>
>;

export function buildListResponseSchema<TReturnType extends TObject>(
  returnTypeSchema: TReturnType,
) {
  return Type.Object({
    items: Type.Array(returnTypeSchema),
    total: Type.Integer({
      description: `Total number of items that can be returned by this list response. However, do note that
this is a MAXIMUM value. If an item is deleted before this cursor is fully exhausted,
it will be omitted; however, items added after the start of this list call will not
be included.`,
    }),
    cursor: Type.Union([Type.Null(), Type.String()], {
      description:
        "The cursor to get the next set of items. If null, there are no more items to fetch.",
    }),
  });
}



export function decodeCursor<TListInput extends typeof ListInputBase>(
  cursor: string,
  listInputSchemaChecker: TypeCheck<TListInput>
) {
  const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
  const { r, t, o } = decoded;
  if (listInputSchemaChecker.Check(r)) {
    return {
      original: r,
      offset: o,
      onlyBefore: new Date(t),
    }
  }

  throw new BadRequestError("Invalid cursor: " + JSON.stringify([...listInputSchemaChecker.Errors(r)]));
}

export function encodeCursor<TListInput extends typeof ListInputBase>(
  listInput: TListInput,
  currentOffset: number,
  onlyBefore: Date | string,
): string {
  const cursor: ListCursorSchema<TListInput> = {
    r: listInput,
    t: (typeof onlyBefore === "string" ? new Date(onlyBefore) : onlyBefore).toISOString(),
    o: currentOffset,
  };
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}
