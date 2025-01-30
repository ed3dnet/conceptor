import type { Static, TSchema } from "@sinclair/typebox";
import type {
  TypeCheck,
  ValueError,
  ValueErrorIterator,
} from "@sinclair/typebox/compiler";

export class TypeCheckEnsureFailedError extends Error {
  readonly typeCheckErrors: ReadonlyArray<ValueError>;

  constructor(errors: ValueErrorIterator) {
    super(
      "Object validation failed. Consult this.typeCheckErrors for more information.",
    );
    this.typeCheckErrors = [...errors];
  }
}

export function EnsureTypeCheck<T extends TSchema>(
  value: unknown,
  checker: TypeCheck<T>,
): Static<T> {
  const result = checker.Check(value);

  if (!result) {
    throw new TypeCheckEnsureFailedError(checker.Errors(value));
  }

  return value;
}
