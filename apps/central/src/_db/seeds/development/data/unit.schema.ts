import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

const SeedBaseUnit = Type.Object({
  id: Type.String(),
  name: Type.String(),
  kind: Type.Union([
    Type.Literal("Organizational"),
    Type.Literal("Individual"),
  ]),
  parent_id: Type.Union([Type.String(), Type.Null()]),
  insights: Type.Array(
    Type.Object({
      sourceEmployeeIds: Type.Array(Type.String()),
      insightContent: Type.String(),
    }),
  ),
});

const SeedIndividualUnit = Type.Intersect([
  SeedBaseUnit,
  Type.Object({
    kind: Type.Literal("Individual"),
    employee_id: Type.Union([Type.String(), Type.Null()]),
  }),
]);

const SeedOrganizationalUnit = Type.Intersect([
  SeedBaseUnit,
  Type.Object({
    kind: Type.Literal("Organizational"),
    leader_unit_id: Type.String(),
  }),
]);

export const SeedUnit = Type.Union([
  SeedIndividualUnit,
  SeedOrganizationalUnit,
]);
export const SeedUnitChecker = TypeCompiler.Compile(SeedUnit);

export const SeedUnits = Type.Array(SeedUnit);
export const SeedUnitsChecker = TypeCompiler.Compile(SeedUnits);

export type SeedUnit = Static<typeof SeedUnit>;
export type SeedUnits = Static<typeof SeedUnits>;
