CREATE SCHEMA "app_meta";
--> statement-breakpoint
CREATE TYPE "public"."ask_visibility" AS ENUM('private', 'derive-only', 'upward', 'downward', 'public');--> statement-breakpoint
CREATE TYPE "public"."image_rendition_format" AS ENUM('fallback', 'image/webp', 'image/avif');--> statement-breakpoint
CREATE TYPE "public"."multiple_answer_strategy" AS ENUM('disallow', 'remember-last');--> statement-breakpoint
CREATE TYPE "public"."reference_direction" AS ENUM('subject', 'object');--> statement-breakpoint
CREATE TYPE "public"."s3_bucket_name" AS ENUM('core', 'user-content', 'upload-staging');--> statement-breakpoint
CREATE TYPE "public"."transcription_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."unit_kind" AS ENUM('individual', 'organizational');--> statement-breakpoint
CREATE TABLE "answers" (
	"answer_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ask_response_id" uuid NOT NULL,
	"text" text NOT NULL,
	"extra_attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "asks" (
	"ask_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"is_blocking" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"hardcode_kind" text,
	"source_agent_name" text,
	"notify_source_agent" boolean,
	"query" jsonb NOT NULL,
	"visibility" "ask_visibility" NOT NULL,
	"multiple_answer_strategy" "multiple_answer_strategy" NOT NULL,
	"extra_attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ask_references" (
	"ask_reference_id" uuid PRIMARY KEY NOT NULL,
	"ask_id" uuid NOT NULL,
	"reference_direction" "reference_direction" NOT NULL,
	"unit_id" uuid,
	"initiative_id" uuid,
	"capability_id" uuid,
	"answer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "one_reference_target" CHECK ((
        ("ask_references"."unit_id" IS NOT NULL)::integer +
        ("ask_references"."initiative_id" IS NOT NULL)::integer +
        ("ask_references"."capability_id" IS NOT NULL)::integer +
        ("ask_references"."answer_id" IS NOT NULL)::integer
      ) = 1)
);
--> statement-breakpoint
CREATE TABLE "ask_responses" (
	"ask_response_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ask_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"response" jsonb NOT NULL,
	"extra_attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
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
	"capability_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"extra_attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
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
	"initiative_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"extra_attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("initiatives"."end_date" IS NULL OR "initiatives"."end_date" > "initiatives"."start_date")
);
--> statement-breakpoint
CREATE TABLE "initiative_capabilities" (
	"initiative_capability_id" uuid PRIMARY KEY NOT NULL,
	"initiative_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"extra_attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("initiative_capabilities"."end_date" IS NULL OR "initiative_capabilities"."end_date" > "initiative_capabilities"."start_date")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"extra_attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
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
	"unit_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "unit_kind" NOT NULL,
	"parent_unit_id" uuid,
	"description" text NOT NULL,
	"extra_attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_parent" CHECK ("units"."unit_id" != "units"."parent_unit_id")
);
--> statement-breakpoint
CREATE TABLE "unit_ancestry" (
	"unit_id" uuid NOT NULL,
	"ancestor_unit_id" uuid,
	"distance" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_assignments" (
	"unit_assignment_id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"extra_attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("unit_assignments"."end_date" IS NULL OR "unit_assignments"."end_date" > "unit_assignments"."start_date")
);
--> statement-breakpoint
CREATE TABLE "unit_capabilities" (
	"unit_capability_id" uuid PRIMARY KEY NOT NULL,
	"unit_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"is_formal" boolean DEFAULT false NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"extra_attributes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "valid_dates" CHECK ("unit_capabilities"."end_date" IS NULL OR "unit_capabilities"."end_date" > "unit_capabilities"."start_date")
);
--> statement-breakpoint
CREATE TABLE "unit_tags" (
	"unit_tag_id" uuid PRIMARY KEY NOT NULL,
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
	"extra_attributes" jsonb NOT NULL,
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
	"external_id_kind" text NOT NULL,
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
	"user_tag_id" uuid PRIMARY KEY NOT NULL,
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
ALTER TABLE "answers" ADD CONSTRAINT "answers_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_ask_response_id_ask_responses_ask_response_id_fk" FOREIGN KEY ("ask_response_id") REFERENCES "public"."ask_responses"("ask_response_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asks" ADD CONSTRAINT "asks_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_references" ADD CONSTRAINT "ask_references_ask_id_asks_ask_id_fk" FOREIGN KEY ("ask_id") REFERENCES "public"."asks"("ask_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_references" ADD CONSTRAINT "ask_references_unit_id_units_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_references" ADD CONSTRAINT "ask_references_initiative_id_initiatives_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("initiative_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_references" ADD CONSTRAINT "ask_references_capability_id_capabilities_capability_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("capability_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_references" ADD CONSTRAINT "ask_references_answer_id_answers_answer_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("answer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_responses" ADD CONSTRAINT "ask_responses_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_responses" ADD CONSTRAINT "ask_responses_ask_id_asks_ask_id_fk" FOREIGN KEY ("ask_id") REFERENCES "public"."asks"("ask_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_responses" ADD CONSTRAINT "ask_responses_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_connectors" ADD CONSTRAINT "auth_connectors_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_connector_domains" ADD CONSTRAINT "auth_connector_domains_auth_connector_id_auth_connectors_auth_connector_id_fk" FOREIGN KEY ("auth_connector_id") REFERENCES "public"."auth_connectors"("auth_connector_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_uploads" ADD CONSTRAINT "image_uploads_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_capabilities" ADD CONSTRAINT "initiative_capabilities_initiative_id_initiatives_initiative_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("initiative_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_capabilities" ADD CONSTRAINT "initiative_capabilities_capability_id_capabilities_capability_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("capability_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_capabilities" ADD CONSTRAINT "initiative_capabilities_unit_id_units_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcription_jobs" ADD CONSTRAINT "transcription_jobs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_parent_unit_id_units_unit_id_fk" FOREIGN KEY ("parent_unit_id") REFERENCES "public"."units"("unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ancestry" ADD CONSTRAINT "unit_ancestry_unit_id_units_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_ancestry" ADD CONSTRAINT "unit_ancestry_ancestor_unit_id_units_unit_id_fk" FOREIGN KEY ("ancestor_unit_id") REFERENCES "public"."units"("unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_assignments" ADD CONSTRAINT "unit_assignments_unit_id_units_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_assignments" ADD CONSTRAINT "unit_assignments_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_capabilities" ADD CONSTRAINT "unit_capabilities_unit_id_units_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_capabilities" ADD CONSTRAINT "unit_capabilities_capability_id_capabilities_capability_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("capability_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_tags" ADD CONSTRAINT "unit_tags_unit_id_units_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_connector_id_auth_connectors_auth_connector_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."auth_connectors"("auth_connector_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_external_ids" ADD CONSTRAINT "user_external_ids_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_system_permissions" ADD CONSTRAINT "user_system_permissions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_initiative_capabilities_initiative" ON "initiative_capabilities" USING btree ("initiative_id");--> statement-breakpoint
CREATE INDEX "idx_initiative_capabilities_capability" ON "initiative_capabilities" USING btree ("capability_id");--> statement-breakpoint
CREATE INDEX "idx_initiative_capabilities_unit" ON "initiative_capabilities" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_initiative_capabilities_dates" ON "initiative_capabilities" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_units_parent" ON "units" USING btree ("parent_unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_ancestry_unit" ON "unit_ancestry" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_ancestry_ancestor" ON "unit_ancestry" USING btree ("ancestor_unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_assignments_unit" ON "unit_assignments" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_assignments_user" ON "unit_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_unit_assignments_dates" ON "unit_assignments" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_unit_capabilities_unit" ON "unit_capabilities" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "idx_unit_capabilities_capability" ON "unit_capabilities" USING btree ("capability_id");--> statement-breakpoint
CREATE INDEX "idx_unit_capabilities_dates" ON "unit_capabilities" USING btree ("start_date","end_date");