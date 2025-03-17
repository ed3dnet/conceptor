CREATE SCHEMA "app_meta";
--> statement-breakpoint
CREATE TYPE "public"."capability_permission_type" AS ENUM('view', 'edit', 'assign', 'approve', 'delete');--> statement-breakpoint
CREATE TYPE "public"."global_permission_type" AS ENUM('admin', 'audit', 'create_units', 'create_initiatives', 'create_capabilities');--> statement-breakpoint
CREATE TYPE "public"."image_rendition_format" AS ENUM('fallback', 'image/webp', 'image/avif');--> statement-breakpoint
CREATE TYPE "public"."information_type" AS ENUM('boolean', 'gradient', 'text');--> statement-breakpoint
CREATE TYPE "public"."initiative_permission_type" AS ENUM('view', 'edit', 'manage_resources', 'approve_changes', 'close');--> statement-breakpoint
CREATE TYPE "public"."llm_connector_name" AS ENUM('general', 'shortSummarization');--> statement-breakpoint
CREATE TYPE "public"."llm_message_role" AS ENUM('system', 'human', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."s3_bucket_name" AS ENUM('core', 'user-content', 'upload-staging');--> statement-breakpoint
CREATE TYPE "public"."transcription_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."unit_permission_type" AS ENUM('manage_reports', 'assign_work', 'approve_time_off', 'manage_unit', 'view_reports');--> statement-breakpoint
CREATE TYPE "public"."unit_type" AS ENUM('individual', 'team', 'management');--> statement-breakpoint
CREATE TABLE "auth_connectors" (
	"auth_connector_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auth_connector_domains" (
	"auth_connector_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "capabilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "capability_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"target_capability_id" uuid NOT NULL,
	"permission_type" "capability_permission_type" NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("capability_permissions"."end_date" IS NULL OR "capability_permissions"."end_date" > "capability_permissions"."start_date")
);
--> statement-breakpoint
CREATE TABLE "capability_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"capability_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "unique_capability_tag" UNIQUE("capability_id","key")
);
--> statement-breakpoint
CREATE TABLE "global_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"permission_type" "global_permission_type" NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("global_permissions"."end_date" IS NULL OR "global_permissions"."end_date" > "global_permissions"."start_date")
);
--> statement-breakpoint
CREATE TABLE "images" (
	"image_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"usage" text NOT NULL,
	"bucket" "s3_bucket_name" NOT NULL,
	"path" text NOT NULL,
	"blurhash" text,
	"ready_renditions" "image_rendition_format"[] DEFAULT '{}' NOT NULL,
	"image_upload_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "image_uploads" (
	"image_upload_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"usage" text NOT NULL,
	"staging_object_name" text NOT NULL,
	"target_bucket" "s3_bucket_name" NOT NULL,
	"target_path" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "initiatives" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("initiatives"."end_date" IS NULL OR "initiatives"."end_date" > "initiatives"."start_date")
);
--> statement-breakpoint
CREATE TABLE "initiative_capabilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"initiative_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("initiative_capabilities"."end_date" IS NULL OR "initiative_capabilities"."end_date" > "initiative_capabilities"."start_date")
);
--> statement-breakpoint
CREATE TABLE "initiative_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"target_initiative_id" uuid NOT NULL,
	"permission_type" "initiative_permission_type" NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("initiative_permissions"."end_date" IS NULL OR "initiative_permissions"."end_date" > "initiative_permissions"."start_date")
);
--> statement-breakpoint
CREATE TABLE "initiative_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"initiative_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "unique_initiative_tag" UNIQUE("initiative_id","key")
);
--> statement-breakpoint
CREATE TABLE "llm_conversations" (
	"conversation_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connector_name" "llm_connector_name" NOT NULL,
	"model_options" jsonb NOT NULL,
	"purpose" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "llm_conversation_messages" (
	"message_id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "llm_message_role" NOT NULL,
	"content" jsonb NOT NULL,
	"order_index" integer NOT NULL,
	"token_count" integer,
	"response_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcription_jobs" (
	"transcription_job_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_bucket" "s3_bucket_name" NOT NULL,
	"source_object_name" text NOT NULL,
	"options" jsonb NOT NULL,
	"status" "transcription_job_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"transcription_text" text,
	"transcription_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "unit_type" NOT NULL,
	"parent_unit_id" uuid,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_parent" CHECK ("units"."id" != "units"."parent_unit_id")
);
--> statement-breakpoint
CREATE TABLE "unit_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("unit_assignments"."end_date" IS NULL OR "unit_assignments"."end_date" > "unit_assignments"."start_date")
);
--> statement-breakpoint
CREATE TABLE "unit_capabilities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"is_formal" boolean DEFAULT false NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("unit_capabilities"."end_date" IS NULL OR "unit_capabilities"."end_date" > "unit_capabilities"."start_date")
);
--> statement-breakpoint
CREATE TABLE "unit_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"target_unit_id" uuid NOT NULL,
	"permission_type" "unit_permission_type" NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("unit_permissions"."end_date" IS NULL OR "unit_permissions"."end_date" > "unit_permissions"."start_date")
);
--> statement-breakpoint
CREATE TABLE "unit_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "unique_unit_tag" UNIQUE("unit_id","key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connector_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"idp_user_info" jsonb,
	"disabled_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_emails" (
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_external_ids" (
	"user_id" uuid NOT NULL,
	"external_id_type" text NOT NULL,
	"external_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_system_permissions" (
	"user_id" uuid NOT NULL,
	"permission" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "unique_user_tag" UNIQUE("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "app_meta"."seeds" (
	"seed_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seeds_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
ALTER TABLE "auth_connectors" ADD CONSTRAINT "auth_connectors_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_connector_domains" ADD CONSTRAINT "auth_connector_domains_auth_connector_id_auth_connectors_auth_connector_id_fk" FOREIGN KEY ("auth_connector_id") REFERENCES "public"."auth_connectors"("auth_connector_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_permissions" ADD CONSTRAINT "capability_permissions_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_permissions" ADD CONSTRAINT "capability_permissions_target_capability_id_capabilities_id_fk" FOREIGN KEY ("target_capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_tags" ADD CONSTRAINT "capability_tags_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_permissions" ADD CONSTRAINT "global_permissions_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_uploads" ADD CONSTRAINT "image_uploads_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_capabilities" ADD CONSTRAINT "initiative_capabilities_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_capabilities" ADD CONSTRAINT "initiative_capabilities_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_capabilities" ADD CONSTRAINT "initiative_capabilities_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_permissions" ADD CONSTRAINT "initiative_permissions_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_permissions" ADD CONSTRAINT "initiative_permissions_target_initiative_id_initiatives_id_fk" FOREIGN KEY ("target_initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_tags" ADD CONSTRAINT "initiative_tags_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_conversations" ADD CONSTRAINT "llm_conversations_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_conversation_messages" ADD CONSTRAINT "llm_conversation_messages_conversation_id_llm_conversations_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."llm_conversations"("conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcription_jobs" ADD CONSTRAINT "transcription_jobs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_parent_unit_id_units_id_fk" FOREIGN KEY ("parent_unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_assignments" ADD CONSTRAINT "unit_assignments_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_assignments" ADD CONSTRAINT "unit_assignments_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_capabilities" ADD CONSTRAINT "unit_capabilities_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_capabilities" ADD CONSTRAINT "unit_capabilities_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_permissions" ADD CONSTRAINT "unit_permissions_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_permissions" ADD CONSTRAINT "unit_permissions_target_unit_id_units_id_fk" FOREIGN KEY ("target_unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_tags" ADD CONSTRAINT "unit_tags_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_connector_id_auth_connectors_auth_connector_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."auth_connectors"("auth_connector_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_external_ids" ADD CONSTRAINT "user_external_ids_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_system_permissions" ADD CONSTRAINT "user_system_permissions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_capability_permissions_unit" ON "capability_permissions" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_capability_permissions_target" ON "capability_permissions" USING btree ("target_capability_id");--> statement-breakpoint
CREATE INDEX "idx_capability_permissions_dates" ON "capability_permissions" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_global_permissions_unit" ON "global_permissions" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_global_permissions_dates" ON "global_permissions" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_initiative_capabilities_initiative" ON "initiative_capabilities" USING btree ("initiative_id");--> statement-breakpoint
CREATE INDEX "idx_initiative_capabilities_capability" ON "initiative_capabilities" USING btree ("capability_id");--> statement-breakpoint
CREATE INDEX "idx_initiative_capabilities_unit" ON "initiative_capabilities" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_initiative_capabilities_dates" ON "initiative_capabilities" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_initiative_permissions_unit" ON "initiative_permissions" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_initiative_permissions_target" ON "initiative_permissions" USING btree ("target_initiative_id");--> statement-breakpoint
CREATE INDEX "idx_initiative_permissions_dates" ON "initiative_permissions" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_units_parent" ON "units" USING btree ("parent_unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_assignments_unit" ON "unit_assignments" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_assignments_user" ON "unit_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_unit_assignments_dates" ON "unit_assignments" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_unit_capabilities_unit" ON "unit_capabilities" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_capabilities_capability" ON "unit_capabilities" USING btree ("capability_id");--> statement-breakpoint
CREATE INDEX "idx_unit_capabilities_dates" ON "unit_capabilities" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_unit_permissions_unit" ON "unit_permissions" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_permissions_target" ON "unit_permissions" USING btree ("target_unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_permissions_dates" ON "unit_permissions" USING btree ("start_date","end_date");