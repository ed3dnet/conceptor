import { DateTime } from "luxon";

/**
 * `[ajv-formats]` ISO8601 DateTime
 * @example `2020-12-12T20:20:40+00:00`
 */
export function IsDateTime(value: string, strictTimeZone?: boolean): boolean {
  const dt = DateTime.fromISO(value);

  return dt.isValid;
}
