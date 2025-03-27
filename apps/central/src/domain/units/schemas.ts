import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

import { StringEnum } from "../../lib/ext/typebox/index.js";
import { TenantIds } from "../tenants/id.js";
import { UserIds } from "../users/id.js";

import { UnitIds } from "./id.js";

// DTO Schemas
export const UnitPublic = schemaType(
  "UnitPublic",
  Type.Object({
    __type: Type.Literal("UnitPublic"),
    id: UnitIds.TRichId,
    name: Type.String(),
    type: StringEnum(["individual", "organizational"]),
    parentUnitId: Type.Union([UnitIds.TRichId, Type.Null()]),
    description: Type.String(),
  }),
);
export type UnitPublic = Static<typeof UnitPublic>;

export const UnitWithAssignments = schemaType(
  "UnitWithAssignments",
  Type.Object({
    __type: Type.Literal("UnitWithAssignments"),
    id: UnitIds.TRichId,
    name: Type.String(),
    type: StringEnum(["individual", "organizational"]),
    parentUnitId: Type.Union([UnitIds.TRichId, Type.Null()]),
    description: Type.String(),
    assignments: Type.Array(
      Type.Object({
        userId: UserIds.TRichId,
        startDate: Type.String({ format: "date-time" }),
        endDate: Type.Optional(Type.String({ format: "date-time" })),
      }),
    ),
  }),
);
export type UnitWithAssignments = Static<typeof UnitWithAssignments>;

export const CreateUnitInput = schemaType(
  "CreateUnitInput",
  Type.Object({
    __type: Type.Literal("CreateUnitInput"),
    name: Type.String(),
    type: StringEnum(["individual", "organizational"]),
    parentUnitId: Type.Optional(UnitIds.TRichId),
    description: Type.Optional(Type.String()),
  }),
);
export type CreateUnitInput = Static<typeof CreateUnitInput>;

export const UpdateUnitInput = schemaType(
  "UpdateUnitInput",
  Type.Object({
    __type: Type.Literal("UpdateUnitInput"),
    name: Type.Optional(Type.String()),
    parentUnitId: Type.Optional(UnitIds.TRichId),
    description: Type.Optional(Type.String()),
  }),
);
export type UpdateUnitInput = Static<typeof UpdateUnitInput>;

export const UnitAssignmentInput = schemaType(
  "UnitAssignmentInput",
  Type.Object({
    __type: Type.Literal("UnitAssignmentInput"),
    userId: UserIds.TRichId,
    startDate: Type.Optional(Type.String({ format: "date-time" })),
    endDate: Type.Optional(Type.String({ format: "date-time" })),
  }),
);
export type UnitAssignmentInput = Static<typeof UnitAssignmentInput>;

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
};
