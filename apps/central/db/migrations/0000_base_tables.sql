CREATE SCHEMA "app_meta";
--> statement-breakpoint
CREATE TYPE "public"."auth_connector_type" AS ENUM('saml', 'openid');--> statement-breakpoint
CREATE TYPE "public"."image_rendition_format" AS ENUM('fallback', 'image/webp', 'image/avif');--> statement-breakpoint
CREATE TYPE "public"."llm_connector_name" AS ENUM('general');--> statement-breakpoint
CREATE TYPE "public"."llm_message_role" AS ENUM('system', 'human', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."s3_bucket_name" AS ENUM('core', 'user-public-content', 'user-signed-access', 'upload-staging');--> statement-breakpoint
CREATE TABLE "auth_connectors" (
	"auth_connector_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "auth_connector_type" NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"employee_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connector_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"last_accessed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_emails" (
	"employee_id" uuid NOT NULL,
	"email" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_external_ids" (
	"employee_id" uuid NOT NULL,
	"external_id_type" text NOT NULL,
	"external_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_system_permissions" (
	"employee_id" uuid NOT NULL,
	"permission" text NOT NULL
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
CREATE TABLE "app_meta"."seeds" (
	"seed_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seeds_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
ALTER TABLE "auth_connectors" ADD CONSTRAINT "auth_connectors_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_connector_id_auth_connectors_auth_connector_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."auth_connectors"("auth_connector_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_emails" ADD CONSTRAINT "employee_emails_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_external_ids" ADD CONSTRAINT "employee_external_ids_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_system_permissions" ADD CONSTRAINT "employee_system_permissions_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_uploads" ADD CONSTRAINT "image_uploads_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_conversations" ADD CONSTRAINT "llm_conversations_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_conversation_messages" ADD CONSTRAINT "llm_conversation_messages_conversation_id_llm_conversations_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."llm_conversations"("conversation_id") ON DELETE no action ON UPDATE no action;