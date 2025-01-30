import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";
import type { InferSelectModel } from "drizzle-orm";

import { StringEnum } from "../lib/ext/typebox.js";

import type { SEEDS } from "./schema/app-meta.js";
import {
  type TENANTS,
  type IMAGES,
  type IMAGE_UPLOADS,
} from "./schema/index.js";

export type DBSeed = InferSelectModel<typeof SEEDS>;

export type DBTenant = InferSelectModel<typeof TENANTS>;

export type DBImage = InferSelectModel<typeof IMAGES>;
export type DBImageUpload = InferSelectModel<typeof IMAGE_UPLOADS>;
