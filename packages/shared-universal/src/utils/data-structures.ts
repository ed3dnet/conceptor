type NullishKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : undefined extends T[K] ? K : never;
}[keyof T];
type NonNullishKeys<T> = Exclude<keyof T, NullishKeys<T>>;
export type NonNullishPartial<T> = {
  [K in NullishKeys<T>]+?: Exclude<T[K], null | undefined>;
} & { [K in NonNullishKeys<T>]-?: T[K] };

export type TaggedObject = {
  tags: string[];
};

export function groupByTags<T extends TaggedObject>(
  objects: T[],
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  objects.forEach((obj) => {
    obj.tags.forEach((tag) => {
      if (!grouped[tag]) {
        grouped[tag] = [];
      }

      grouped[tag]!.push(obj);
    });
  });

  return grouped;
}

export function excludeNullish<T extends Record<PropertyKey, unknown>>(
  obj: T,
): NonNullishPartial<T> {
  return Object.entries(obj).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (value != null) {
        acc[key] = value;
      }
      return acc;
    },
    {},
  ) as never;
}
