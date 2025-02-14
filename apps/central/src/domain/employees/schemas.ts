import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

export const IdPUserInfo = Type.Object(
  {
    sub: Type.String(),
    name: Type.Optional(Type.String()),
    given_name: Type.Optional(Type.String()),
    family_name: Type.Optional(Type.String()),
    middle_name: Type.Optional(Type.String()),
    nickname: Type.Optional(Type.String()),
    preferred_username: Type.Optional(Type.String()),
    profile: Type.Optional(Type.String()),
    picture: Type.Optional(Type.String()),
    website: Type.Optional(Type.String()),
    email: Type.String(), // Required field
    email_verified: Type.Optional(Type.Boolean()),
    gender: Type.Optional(Type.String()),
    birthdate: Type.Optional(Type.String()),
    zoneinfo: Type.Optional(Type.String()),
    locale: Type.Optional(Type.String()),
    phone_number: Type.Optional(Type.String()),
    updated_at: Type.Optional(Type.Number()),
    address: Type.Optional(
      Type.Object(
        {
          formatted: Type.Optional(Type.String()),
          street_address: Type.Optional(Type.String()),
          locality: Type.Optional(Type.String()),
          region: Type.Optional(Type.String()),
          postal_code: Type.Optional(Type.String()),
          country: Type.Optional(Type.String()),
        },
        {
          additionalProperties: true,
        },
      ),
    ),
  },
  {
    additionalProperties: true,
  },
);
export type IdPUserInfo = Static<typeof IdPUserInfo>;

export const EmployeePublic = schemaType(
  "EmployeePublic",
  Type.Object({
    __type: Type.Literal("EmployeePublic"),
    employeeId: Type.String({ format: "uuid" }),
    tenantId: Type.String({ format: "uuid" }),
    displayName: Type.String(),
    avatarUrl: Type.Optional(Type.String()),
  }),
);
export type EmployeePublic = Static<typeof EmployeePublic>;

export const EmployeeEmail = Type.Object({
  __type: Type.Literal("EmployeeEmail"),
  email: Type.String(),
  isPrimary: Type.Boolean(),
});
export type EmployeeEmail = Static<typeof EmployeeEmail>;

export const EmployeeExternalId = Type.Object({
  __type: Type.Literal("EmployeeExternalId"),
  externalIdType: Type.String(),
  externalId: Type.String(),
});
export type EmployeeExternalId = Static<typeof EmployeeExternalId>;

export const EmployeeTag = Type.Object({
  __type: Type.Literal("EmployeeTag"),
  key: Type.String(),
  value: Type.String(),
});
export type EmployeeTag = Static<typeof EmployeeTag>;

export const EmployeePrivate = schemaType(
  "EmployeePrivate",
  Type.Object({
    __type: Type.Literal("EmployeePrivate"),
    employeeId: Type.String({ format: "uuid" }),
    tenantId: Type.String({ format: "uuid" }),
    connectorId: Type.String({ format: "uuid" }),
    displayName: Type.String(),
    avatarUrl: Type.Optional(Type.String()),
    lastAccessedAt: Type.Optional(Type.String({ format: "date-time" })),
    emails: Type.Array(EmployeeEmail),
    externalIds: Type.Array(EmployeeExternalId),
    tags: Type.Array(EmployeeTag),
    idpUserInfo: Type.Optional(IdPUserInfo),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.Optional(Type.String({ format: "date-time" })),
  }),
);
export type EmployeePrivate = Static<typeof EmployeePrivate>;
