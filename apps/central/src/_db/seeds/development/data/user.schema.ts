import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

const SeedUserName = Type.Object({
  given: Type.String(),
  family: Type.String(),
  "name-order": Type.Union([
    Type.Literal("family-first"),
    Type.Literal("given-first"),
  ]),
  override: Type.Optional(Type.String()),
});

const SeedUserRelationship = Type.Object({
  target: Type.String(),
  kind: Type.Union([
    Type.Literal("manager"),
    Type.Literal("dotted-line"),
    Type.Literal("works-with"),
  ]),
});

const SeedUserInformation = Type.Object({
  prompt: Type.String(),
  response: Type.String(),
});

const SeedUserLevel = Type.Union([
  Type.Literal("L2"),
  Type.Literal("L3"),
  Type.Literal("L4"),
  Type.Literal("L5"),
  Type.Literal("L6"),
  Type.Literal("L7"),
  Type.Literal("L8"),
  Type.Literal("L9"),
  Type.Literal("L10"),
]);

export const SeedUser = Type.Object({
  id: Type.String(),
  name: SeedUserName,
  enabled: Type.Boolean(),
  title: Type.String(),
  level: SeedUserLevel,
  department: Type.String(),
  sub_department: Type.Optional(Type.String()),
  team: Type.Optional(Type.String()),
  hire_date: Type.String(),
  relationships: Type.Optional(Type.Array(SeedUserRelationship)),
  information: Type.Optional(Type.Array(SeedUserInformation)),
});
export const SeedUserChecker = TypeCompiler.Compile(SeedUser);

export const SeedUsers = Type.Array(SeedUser);
export const SeedUsersChecker = TypeCompiler.Compile(SeedUsers);

export type SeedUser = Static<typeof SeedUser>;
export type SeedUsers = Static<typeof SeedUsers>;
