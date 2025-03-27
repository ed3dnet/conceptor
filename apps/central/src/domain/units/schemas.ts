import { schemaType } from "@eropple/fastify-openapi3";
import { Type, type Static } from "@sinclair/typebox";

import { StringEnum } from "../../lib/ext/typebox.js";

// DTO Schemas
export const UnitPublic = schemaType(
  "UnitPublic",
  Type.Object({
    __type: Type.Literal("UnitPublic"),
    id: Type.String({ format: "uuid" }),
    name: Type.String(),
    type: StringEnum(["individual", "organizational"]),
    parentUnitId: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
    description: Type.String(),
  }),
);
export type UnitPublic = Static<typeof UnitPublic>;

export const UnitWithAssignments = schemaType(
  "UnitWithAssignments",
  Type.Object({
    __type: Type.Literal("UnitWithAssignments"),
    id: Type.String({ format: "uuid" }),
    name: Type.String(),
    type: StringEnum(["individual", "organizational"]),
    parentUnitId: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
    description: Type.String(),
    assignments: Type.Array(
      Type.Object({
        userId: Type.String({ format: "uuid" }),
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
    parentUnitId: Type.Optional(Type.String({ format: "uuid" })),
    description: Type.Optional(Type.String()),
  }),
);
export type CreateUnitInput = Static<typeof CreateUnitInput>;

export const UpdateUnitInput = schemaType(
  "UpdateUnitInput",
  Type.Object({
    __type: Type.Literal("UpdateUnitInput"),
    name: Type.Optional(Type.String()),
    parentUnitId: Type.Optional(Type.String({ format: "uuid" })),
    description: Type.Optional(Type.String()),
  }),
);
export type UpdateUnitInput = Static<typeof UpdateUnitInput>;

export const UnitAssignmentInput = schemaType(
  "UnitAssignmentInput",
  Type.Object({
    __type: Type.Literal("UnitAssignmentInput"),
    userId: Type.String({ format: "uuid" }),
    startDate: Type.Optional(Type.String({ format: "date-time" })),
    endDate: Type.Optional(Type.String({ format: "date-time" })),
  }),
);
export type UnitAssignmentInput = Static<typeof UnitAssignmentInput>;

// Event Schemas
export const UnitCreatedEvent = Type.Object({
  __type: Type.Literal("UnitCreated"),
  tenantId: Type.String({ format: "uuid" }),
  unitId: Type.String({ format: "uuid" }),
  name: Type.String(),
  type: StringEnum(["individual", "organizational"]),
  parentUnitId: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
  timestamp: Type.String({ format: "date-time" }),
});
export type UnitCreatedEvent = Static<typeof UnitCreatedEvent>;

export const UnitUpdatedEvent = Type.Object({
  __type: Type.Literal("UnitUpdated"),
  tenantId: Type.String({ format: "uuid" }),
  unitId: Type.String({ format: "uuid" }),
  changedFields: Type.Array(Type.String()),
  timestamp: Type.String({ format: "date-time" }),
});
export type UnitUpdatedEvent = Static<typeof UnitUpdatedEvent>;

export const UnitDeletedEvent = Type.Object({
  __type: Type.Literal("UnitDeleted"),
  tenantId: Type.String({ format: "uuid" }),
  unitId: Type.String({ format: "uuid" }),
  timestamp: Type.String({ format: "date-time" }),
});
export type UnitDeletedEvent = Static<typeof UnitDeletedEvent>;

export const UserAssignedToUnitEvent = Type.Object({
  __type: Type.Literal("UserAssignedToUnit"),
  tenantId: Type.String({ format: "uuid" }),
  unitId: Type.String({ format: "uuid" }),
  userId: Type.String({ format: "uuid" }),
  startDate: Type.String({ format: "date-time" }),
  endDate: Type.Optional(Type.String({ format: "date-time" })),
  timestamp: Type.String({ format: "date-time" }),
});
export type UserAssignedToUnitEvent = Static<typeof UserAssignedToUnitEvent>;

export const UserUnassignedFromUnitEvent = Type.Object({
  __type: Type.Literal("UserUnassignedFromUnit"),
  tenantId: Type.String({ format: "uuid" }),
  unitId: Type.String({ format: "uuid" }),
  userId: Type.String({ format: "uuid" }),
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
