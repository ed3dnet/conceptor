import { genRandomId } from "./random-id.js";

export function buildRequestIdGenerator(idAbbrev: string) {
  if (idAbbrev.length !== 3) {
    throw new Error("idAbbrev must be 3 characters long");
  }

  return (existingId?: string) => existingId || idAbbrev + "-" + genRandomId();
}
