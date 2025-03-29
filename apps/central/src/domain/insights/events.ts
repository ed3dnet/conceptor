import { Type, type Static } from "@sinclair/typebox";

import {
  AskCreatedEvent,
  AskResponseCreatedEvent,
  AskResponseReansweredEvent,
} from "../questions/events.js";
import { AskIds, AskResponseIds } from "../questions/schemas/id.js";
import { TenantIds } from "../tenants/id.js";

import { AnswerIds } from "./schemas/id.js";

export const AnswerCreatedEvent = Type.Object({
  __type: Type.Literal("AnswerCreated"),
  tenantId: TenantIds.TRichId,
  askId: AskIds.TRichId,
  askResponseId: AskResponseIds.TRichId,
  answerId: AnswerIds.TRichId,
  timestamp: Type.String({ format: "date-time" }),
});
export type AnswerCreatedEvent = Static<typeof AnswerCreatedEvent>;

export const InsightEvents = {
  AskCreatedEvent,
  AskResponseCreatedEvent,
  AskResponseReansweredEvent,
  AnswerCreatedEvent,
};
