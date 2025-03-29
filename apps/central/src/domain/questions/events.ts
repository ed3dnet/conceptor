import { Type, type Static } from "@sinclair/typebox";

import { StringUUID } from "../../lib/ext/typebox/index.js";
import { TenantIds } from "../tenants/id.js";
import { UserIds } from "../users/id.js";

import { AskIds, AskResponseIds } from "./schemas/id.js";

export const AskCreatedEvent = Type.Object({
  __type: Type.Literal("AskCreated"),
  tenantId: TenantIds.TRichId,
  askId: AskIds.TRichId,
  hardcodeKind: Type.Optional(Type.String()),
  sourceAgentName: Type.Optional(Type.String()),
  timestamp: Type.String({ format: "date-time" }),
});
export type AskCreatedEvent = Static<typeof AskCreatedEvent>;

export const AskResponseCreatedEvent = Type.Object({
  __type: Type.Literal("AskResponseCreated"),
  tenantId: TenantIds.TRichId,
  askId: AskIds.TRichId,
  askResponseId: AskResponseIds.TRichId,
  userId: UserIds.TRichId,
  timestamp: Type.String({ format: "date-time" }),
});
export type AskResponseCreatedEvent = Static<typeof AskResponseCreatedEvent>;
