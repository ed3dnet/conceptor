import { schemaType } from "@eropple/fastify-openapi3";
import { Type } from "@sinclair/typebox";
import { pascalCase } from "change-case";
import { uuidToULID, ulidToUUID } from "ulidx";

import {
  StringULIDPattern,
  type StringUUID,
  StringUUIDChecker,
  type StringUUIDType,
} from "../ext/typebox/index.js";

/**
 * A type for "rich IDs" that combines a prefix and a ULID
 * Example: user-01H2XVNZ7C9NXWK3TMCRD9QWMN
 */
export type RichId<Prefix extends string> = `${Prefix}-${string}`;

// strip ^ and $ from base regex
const rawUlidRegex = StringULIDPattern.source.slice(1, -1);

/**
 * Creates a set of utilities for working with rich IDs of a specific prefix
 */
export function createRichIdUtils<Prefix extends string>(prefix: Prefix) {
  const schemaName = pascalCase(`String${pascalCase(prefix)}Id`);
  const TPrefix = Type.Literal(prefix);
  const pattern = new RegExp(`^${prefix}-${rawUlidRegex}$`);

  const TRichId = schemaType(
    schemaName,
    Type.Unsafe<RichId<Prefix>>({
      ...Type.String({ pattern: pattern.source }),
      description: `An ID for a '${prefix}' resource, formatted as '${prefix}-ULID'`,
    }),
  );

  /**
   * Type guard to check if a string is a valid rich ID with the specified prefix
   */
  function guard(value: string): value is RichId<Prefix> {
    return pattern.test(value);
  }

  function assert(value: string): asserts value is RichId<Prefix> {
    if (!guard(value)) {
      throw new Error(`Invalid ${prefix} ID: ${value}`);
    }
  }

  /**
   * Ensures a string is a valid rich ID with the specified prefix, or throws.
   */
  function ensure(value: string): RichId<Prefix> {
    if (guard(value)) {
      return value;
    }

    throw new Error(`Invalid ${prefix} ID: ${value}`);
  }

  /**
   * Converts a UUID or existing rich ID to a rich ID
   * @param id UUID or existing rich ID
   * @returns Rich ID with the specified prefix
   */
  function toRichId(id: string): RichId<Prefix> {
    // If it's already a valid rich ID, return it
    if (guard(id)) {
      return id;
    }

    if (StringUUIDChecker.Check(id)) {
      return `${prefix}-${uuidToULID(id)}`;
    }

    throw new Error(
      `Invalid ID format: ${id}. Expected UUID or ${prefix}-${StringULIDPattern.source}`,
    );
  }

  /**
   * Extracts the UUID from a rich ID
   * @param richId Rich ID with the specified prefix
   * @returns UUID
   */
  function toUUID(richId: RichId<Prefix> | StringUUID): StringUUIDType {
    if (StringUUIDChecker.Check(richId)) {
      return richId;
    }

    // Verify it's a valid rich ID
    if (!guard(richId)) {
      throw new Error(`Invalid rich ID format: ${richId}`);
    }

    // Extract the ULID part
    const ulid = richId.substring(prefix.length + 1);

    return ulidToUUID(ulid) as StringUUIDType;
  }

  return {
    pattern,
    guard,
    ensure,
    TPrefix,
    TRichId,
    toRichId,
    toUUID,
  };
}
