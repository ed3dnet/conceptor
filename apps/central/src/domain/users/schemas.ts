import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { StringUUID } from "../../lib/ext/typebox.js";

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

export const UserPublic = schemaType(
  "UserPublic",
  Type.Object({
    __type: Type.Literal("UserPublic"),
    userId: StringUUID,
    tenantId: StringUUID,
    displayName: Type.String(),
    avatarUrl: Type.Optional(Type.String()),
  }),
);
export type UserPublic = Static<typeof UserPublic>;

export const UserEmail = schemaType(
  "UserEmail",
  Type.Object({
    __type: Type.Literal("UserEmail"),
    email: Type.String(),
    isPrimary: Type.Boolean(),
  }),
);
export type UserEmail = Static<typeof UserEmail>;

export const UserExternalId = schemaType(
  "UserExternalId",
  Type.Object({
    __type: Type.Literal("UserExternalId"),
    externalIdType: Type.String(),
    externalId: Type.String(),
  }),
);
export type UserExternalId = Static<typeof UserExternalId>;

export const UserTag = Type.Object({
  __type: Type.Literal("UserTag"),
  key: Type.String(),
  value: Type.String(),
});
export type UserTag = Static<typeof UserTag>;

export const UserPrivate = schemaType(
  "UserPrivate",
  Type.Object({
    __type: Type.Literal("UserPrivate"),
    userId: StringUUID,
    tenantId: StringUUID,
    connectorId: StringUUID,
    displayName: Type.String(),
    avatarUrl: Type.Optional(Type.String()),
    lastAccessedAt: Type.Optional(Type.String({ format: "date-time" })),
    emails: Type.Array(UserEmail),
    externalIds: Type.Array(UserExternalId),
    tags: Type.Array(UserTag),
    idpUserInfo: Type.Optional(IdPUserInfo),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.Optional(Type.String({ format: "date-time" })),
  }),
);
export type UserPrivate = Static<typeof UserPrivate>;
