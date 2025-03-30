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
    unitId: UnitIds.TRichId,
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
    ...UnitPublic.properties,
    __type: Type.Literal("UnitWithAssignments"),
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

export const UnitHierarchyNode = schemaType(
  "UnitHierarchyNode",
  Type.Recursive((This) =>
    Type.Object({
      __type: Type.Literal("UnitHierarchyNode"),
      unit: UnitPublic,
      children: Type.Array(This),
    }),
  ),
);
export type UnitHierarchyNode = Static<typeof UnitHierarchyNode>;

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
