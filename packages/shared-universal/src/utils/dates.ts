import { DateTime } from "luxon";

export function shortDateStyle(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;

  return DateTime.fromJSDate(d).toFormat("y LLL d");
}

export function longDateStyle(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;

  return DateTime.fromJSDate(d).toFormat("cccc, LLLL d, y");
}
