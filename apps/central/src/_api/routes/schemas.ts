import { type Static, Type } from "@sinclair/typebox";

export const RedirectResponse = Type.Object({
  redirectTo: Type.String(),
});
export type RedirectResponse = Static<typeof RedirectResponse>;
