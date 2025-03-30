import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { AuthConnectorIds } from "../auth-connectors/id.js";
import { TenantIds } from "../tenants/id.js";

import { UserIds } from "./id.js";

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
    userId: UserIds.TRichId,
    tenantId: TenantIds.TRichId,
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
    externalIdKind: Type.String(),
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
    ...UserPublic.properties,
    __type: Type.Literal("UserPrivate"),
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

export const CreateUserInput = schemaType(
  "CreateUserInput",
  Type.Object({
    __type: Type.Literal("CreateUserInput"),
    tenantId: TenantIds.TRichId,
    connectorId: AuthConnectorIds.TRichId,
    idpUserInfo: IdPUserInfo,
    displayName: Type.Optional(Type.String()),
    userId: Type.Optional(UserIds.TRichId),
    avatarUrl: Type.Optional(Type.String()),
    externalIds: Type.Optional(
      Type.Array(
        Type.Object({
          kind: Type.String(),
          id: Type.String(),
        }),
      ),
    ),
  }),
);
export type CreateUserInput = Static<typeof CreateUserInput>;

// Event Schemas
export const UserCreatedEvent = Type.Object({
  __type: Type.Literal("UserCreated"),
  tenantId: TenantIds.TRichId,
  userId: UserIds.TRichId,
  email: Type.String(),
  displayName: Type.String(),
  timestamp: Type.String({ format: "date-time" }),
});
export type UserCreatedEvent = Static<typeof UserCreatedEvent>;

export const UserUpdatedEvent = Type.Object({
  __type: Type.Literal("UserUpdated"),
  tenantId: TenantIds.TRichId,
  userId: UserIds.TRichId,
  changedFields: Type.Array(Type.String()),
  timestamp: Type.String({ format: "date-time" }),
});
export type UserUpdatedEvent = Static<typeof UserUpdatedEvent>;

export const UserEmailAddedEvent = Type.Object({
  __type: Type.Literal("UserEmailAdded"),
  tenantId: TenantIds.TRichId,
  userId: UserIds.TRichId,
  email: Type.String(),
  isPrimary: Type.Boolean(),
  timestamp: Type.String({ format: "date-time" }),
});
export type UserEmailAddedEvent = Static<typeof UserEmailAddedEvent>;

export const UserEmailSetPrimaryEvent = Type.Object({
  __type: Type.Literal("UserEmailSetPrimary"),
  tenantId: TenantIds.TRichId,
  userId: UserIds.TRichId,
  email: Type.String(),
  timestamp: Type.String({ format: "date-time" }),
});
export type UserEmailSetPrimaryEvent = Static<typeof UserEmailSetPrimaryEvent>;

export const UserEmailRemovedEvent = Type.Object({
  __type: Type.Literal("UserEmailRemoved"),
  tenantId: TenantIds.TRichId,
  userId: UserIds.TRichId,
  email: Type.String(),
  timestamp: Type.String({ format: "date-time" }),
});
export type UserEmailRemovedEvent = Static<typeof UserEmailRemovedEvent>;

// Export all events in a single object for easy import in event-list.ts
export const UserEvents = {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserEmailAddedEvent,
  UserEmailSetPrimaryEvent,
  UserEmailRemovedEvent,
};
