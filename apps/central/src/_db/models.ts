import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";
import type { InferSelectModel } from "drizzle-orm";

import { StringEnum } from "../lib/ext/typebox.js";

import type { SEEDS } from "./schema/app-meta.js";
import {
  type TENANTS,
  type IMAGES,
  type IMAGE_UPLOADS,
  type LLM_CONVERSATIONS,
  type LLM_CONVERSATION_MESSAGES,
  type USERS,
  type USER_EMAILS,
  type USER_SYSTEM_PERMISSIONS,
  type USER_EXTERNAL_IDS,
  type AUTH_CONNECTORS,
  type AUTH_CONNECTOR_DOMAINS,
  type USER_TAGS,
  type USER_SESSIONS,
} from "./schema/index.js";

export type DBSeed = InferSelectModel<typeof SEEDS>;

export type DBTenant = InferSelectModel<typeof TENANTS>;

export type DBImage = InferSelectModel<typeof IMAGES>;
export type DBImageUpload = InferSelectModel<typeof IMAGE_UPLOADS>;

export type DBLLMConversation = InferSelectModel<typeof LLM_CONVERSATIONS>;
export type DBLLMConversationMessage = InferSelectModel<
  typeof LLM_CONVERSATION_MESSAGES
>;

export type DBUser = InferSelectModel<typeof USERS>;
export type DBUserSystemPermission = InferSelectModel<
  typeof USER_SYSTEM_PERMISSIONS
>;
export type DBUserEmail = InferSelectModel<typeof USER_EMAILS>;
export type DBUserExternalId = InferSelectModel<typeof USER_EXTERNAL_IDS>;
export type DBUserTag = InferSelectModel<typeof USER_TAGS>;

export type DBAuthConnector = InferSelectModel<typeof AUTH_CONNECTORS>;
export type DBAuthConnectorDomain = InferSelectModel<
  typeof AUTH_CONNECTOR_DOMAINS
>;
export type DBUserSession = InferSelectModel<typeof USER_SESSIONS>;
