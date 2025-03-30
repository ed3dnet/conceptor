import { Type, type Static } from "@sinclair/typebox";

import { StringEnum } from "../../lib/ext/typebox/index.js";
import { TenantIds } from "../tenants/id.js";
import { UserIds } from "../users/id.js";

import { UnitIds } from "./id.js";

export const UnitAttachedToParentEvent = Type.Object({
  __type: Type.Literal("UnitAttachedToParent"),
  tenantId: TenantIds.TRichId,
  unitId: UnitIds.TRichId,
  parentUnitId: UnitIds.TRichId,
  timestamp: Type.String({ format: "date-time" }),
});
export type UnitAttachedToParentEvent = Static<
  typeof UnitAttachedToParentEvent
>;

export const UnitDetachedFromParentEvent = Type.Object({
  __type: Type.Literal("UnitDetachedFromParent"),
  tenantId: TenantIds.TRichId,
  unitId: UnitIds.TRichId,
  previousParentUnitId: UnitIds.TRichId,
  timestamp: Type.String({ format: "date-time" }),
});
export type UnitDetachedFromParentEvent = Static<
  typeof UnitDetachedFromParentEvent
>;
// Event Schemas
export const UnitCreatedEvent = Type.Object({
  __type: Type.Literal("UnitCreated"),
  tenantId: TenantIds.TRichId,
  unitId: UnitIds.TRichId,
  name: Type.String(),
  type: StringEnum(["individual", "organizational"]),
  parentUnitId: Type.Union([UnitIds.TRichId, Type.Null()]),
  timestamp: Type.String({ format: "date-time" }),
});
export type UnitCreatedEvent = Static<typeof UnitCreatedEvent>;

export const UnitUpdatedEvent = Type.Object({
  __type: Type.Literal("UnitUpdated"),
  tenantId: TenantIds.TRichId,
  unitId: UnitIds.TRichId,
  changedFields: Type.Array(Type.String()),
  timestamp: Type.String({ format: "date-time" }),
});
export type UnitUpdatedEvent = Static<typeof UnitUpdatedEvent>;

export const UnitDeletedEvent = Type.Object({
  __type: Type.Literal("UnitDeleted"),
  tenantId: TenantIds.TRichId,
  unitId: UnitIds.TRichId,
  timestamp: Type.String({ format: "date-time" }),
});
export type UnitDeletedEvent = Static<typeof UnitDeletedEvent>;

export const UserAssignedToUnitEvent = Type.Object({
  __type: Type.Literal("UserAssignedToUnit"),
  tenantId: TenantIds.TRichId,
  unitId: UnitIds.TRichId,
  userId: UserIds.TRichId,
  startDate: Type.String({ format: "date-time" }),
  endDate: Type.Optional(Type.String({ format: "date-time" })),
  timestamp: Type.String({ format: "date-time" }),
});
export type UserAssignedToUnitEvent = Static<typeof UserAssignedToUnitEvent>;

export const UserUnassignedFromUnitEvent = Type.Object({
  __type: Type.Literal("UserUnassignedFromUnit"),
  tenantId: TenantIds.TRichId,
  unitId: UnitIds.TRichId,
  userId: UserIds.TRichId,
  timestamp: Type.String({ format: "date-time" }),
});
export type UserUnassignedFromUnitEvent = Static<
  typeof UserUnassignedFromUnitEvent
>;

// Export all events in a single object for easy import in event-list.ts
export const UnitEvents = {
  UnitCreatedEvent,
  UnitUpdatedEvent,
  UnitDeletedEvent,
  UserAssignedToUnitEvent,
  UserUnassignedFromUnitEvent,
  UnitAttachedToParentEvent,
  UnitDetachedFromParentEvent,
};
