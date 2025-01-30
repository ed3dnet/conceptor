CREATE SCHEMA "app_meta";
--> statement-breakpoint
CREATE SCHEMA "labeler";
--> statement-breakpoint
CREATE SCHEMA "jetstreamer";
--> statement-breakpoint
CREATE TYPE "public"."identity_status" AS ENUM('verified', 'unverified', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."image_rendition_format" AS ENUM('fallback', 'image/webp', 'image/avif');--> statement-breakpoint
CREATE TYPE "public"."s3_bucket_name" AS ENUM('core', 'user-public-content', 'user-signed-access', 'upload-staging');--> statement-breakpoint
CREATE TYPE "public"."site_domain_control_source" AS ENUM('subdomain', 'custom-nonhosted');--> statement-breakpoint
CREATE TYPE "public"."site_tier" AS ENUM('standard', 'plus', 'professional');--> statement-breakpoint
CREATE TYPE "public"."social_oauth2_provider_kind" AS ENUM('github', 'gitlab', 'threads', 'tiktok', 'youtube', 'twitch');--> statement-breakpoint
CREATE TYPE "public"."web_verification_method" AS ENUM('meta-tag', 'rel-me', 'well-known', 'dns-txt');--> statement-breakpoint
CREATE TYPE "public"."outbound_label_kind" AS ENUM('connected', 'linked', 'irl', 'fishy');--> statement-breakpoint
CREATE TABLE "atproto_sessions" (
	"key" text PRIMARY KEY NOT NULL,
	"session_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "images" (
	"image_id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
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
	"user_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"usage" text NOT NULL,
	"staging_object_name" text NOT NULL,
	"target_bucket" "s3_bucket_name" NOT NULL,
	"target_path" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mastodon_apps" (
	"mastodon_app_id" uuid PRIMARY KEY NOT NULL,
	"instance_url" text NOT NULL,
	"client_id" jsonb NOT NULL,
	"client_secret" jsonb NOT NULL,
	"scopes" text NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"user_id" uuid NOT NULL,
	"site_id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"blurb" jsonb NOT NULL,
	"tier" "site_tier" DEFAULT 'standard' NOT NULL,
	"custom_capabilities" text[] DEFAULT '{}' NOT NULL,
	"css_theme" text DEFAULT 'default' NOT NULL,
	"custom_css" text DEFAULT '' NOT NULL,
	"settings" jsonb DEFAULT '{"version":1,"showContainerTitles":true}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "sites_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "site_atproto_identities" (
	"atproto_identity_id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"did" text NOT NULL,
	"handle" text NOT NULL,
	"profile_data" jsonb NOT NULL,
	"display_on_site" boolean DEFAULT true NOT NULL,
	"order" double precision NOT NULL,
	"status" "identity_status" DEFAULT 'unverified' NOT NULL,
	"status_last_checked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "site_atproto_identities_siteId_unique" UNIQUE("site_id"),
	CONSTRAINT "site_atproto_identities_did_unique" UNIQUE("did")
);
--> statement-breakpoint
CREATE TABLE "site_avatars" (
	"site_avatar_id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_content_blocks" (
	"site_content_block_id" uuid PRIMARY KEY NOT NULL,
	"site_content_container_id" uuid NOT NULL,
	"order" double precision NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"block_kind" text GENERATED ALWAYS AS ("site_content_blocks"."render_settings"->>'kind'::text) STORED,
	"block_version" integer GENERATED ALWAYS AS (("site_content_blocks"."render_settings"->>'version')::integer) STORED,
	"render_settings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "settingsJsonConstraint" CHECK (
      jsonb_typeof("site_content_blocks"."render_settings") = 'object'
      AND "site_content_blocks"."render_settings" ? 'kind'
      AND "site_content_blocks"."render_settings" ? 'version'
      AND "site_content_blocks"."render_settings" ? 't'
      AND jsonb_typeof("site_content_blocks"."render_settings"->'kind') = 'string'
      AND jsonb_typeof("site_content_blocks"."render_settings"->'version') = 'number'
      AND "site_content_blocks"."render_settings"->>'t' = 'cr')
);
--> statement-breakpoint
CREATE TABLE "site_content_containers" (
	"site_content_container_id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"title" text,
	"order" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_domains" (
	"site_domain_id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"fqdn" text NOT NULL,
	"control_source" "site_domain_control_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_header_images" (
	"site_header_image_id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_mastodon_identities" (
	"mastodon_identity_id" uuid PRIMARY KEY NOT NULL,
	"mastodon_app_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"display_on_site" boolean DEFAULT true NOT NULL,
	"order" double precision NOT NULL,
	"status" "identity_status" DEFAULT 'unverified' NOT NULL,
	"status_last_checked_at" timestamp with time zone NOT NULL,
	"access_token" jsonb NOT NULL,
	"refresh_token" jsonb,
	"last_refreshed_at" timestamp with time zone,
	"provider_metadata" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "site_mastodon_identities_siteId_mastodonAppId_unique" UNIQUE("site_id","mastodon_app_id")
);
--> statement-breakpoint
CREATE TABLE "site_social_oauth2_identities" (
	"social_oauth2_identity_id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"provider" "social_oauth2_provider_kind" NOT NULL,
	"provider_id" text NOT NULL,
	"provider_username" text NOT NULL,
	"display_on_site" boolean DEFAULT true NOT NULL,
	"order" double precision NOT NULL,
	"status" "identity_status" DEFAULT 'unverified' NOT NULL,
	"status_last_checked_at" timestamp with time zone NOT NULL,
	"access_token" jsonb NOT NULL,
	"refresh_token" jsonb,
	"last_refreshed_at" timestamp with time zone,
	"provider_metadata" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_web_identities" (
	"web_identity_id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"url" text NOT NULL,
	"verification_method" "web_verification_method",
	"display_on_site" boolean DEFAULT true NOT NULL,
	"order" double precision NOT NULL,
	"last_verification_attempt" timestamp with time zone,
	"status" "identity_status" DEFAULT 'unverified' NOT NULL,
	"status_last_checked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "site_web_identities_siteId_url_unique" UNIQUE("site_id","url")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"token_salt" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "users_displayName_unique" UNIQUE("display_name"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_avatars" (
	"user_avatar_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"object_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "user_avatars_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_magic_links" (
	"user_magic_link_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"redirect_to" text NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_magic_links_userId_unique" UNIQUE("user_id"),
	CONSTRAINT "user_magic_links_token_unique" UNIQUE("token")
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
CREATE TABLE "labeler"."labels" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"src" text NOT NULL,
	"uri" text NOT NULL,
	"cid" text,
	"val" text NOT NULL,
	"neg" boolean DEFAULT false NOT NULL,
	"cts" timestamp with time zone NOT NULL,
	"exp" timestamp with time zone,
	"sig" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labeler"."outbound_labels" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uri" text NOT NULL,
	"kind" "outbound_label_kind" NOT NULL,
	"neg" boolean DEFAULT false NOT NULL,
	"exp" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jetstreamer"."cursor" (
	"value" bigint PRIMARY KEY NOT NULL,
	CONSTRAINT "only_one_row" CHECK ("jetstreamer"."cursor"."value" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_uploads" ADD CONSTRAINT "image_uploads_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_uploads" ADD CONSTRAINT "image_uploads_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_atproto_identities" ADD CONSTRAINT "site_atproto_identities_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_avatars" ADD CONSTRAINT "site_avatars_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_avatars" ADD CONSTRAINT "site_avatars_image_id_images_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("image_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_content_blocks" ADD CONSTRAINT "site_content_blocks_site_content_container_id_site_content_containers_site_content_container_id_fk" FOREIGN KEY ("site_content_container_id") REFERENCES "public"."site_content_containers"("site_content_container_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_content_containers" ADD CONSTRAINT "site_content_containers_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "site_domains_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_header_images" ADD CONSTRAINT "site_header_images_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_header_images" ADD CONSTRAINT "site_header_images_image_id_images_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("image_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_mastodon_identities" ADD CONSTRAINT "site_mastodon_identities_mastodon_app_id_mastodon_apps_mastodon_app_id_fk" FOREIGN KEY ("mastodon_app_id") REFERENCES "public"."mastodon_apps"("mastodon_app_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_mastodon_identities" ADD CONSTRAINT "site_mastodon_identities_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_social_oauth2_identities" ADD CONSTRAINT "site_social_oauth2_identities_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_web_identities" ADD CONSTRAINT "site_web_identities_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_magic_links" ADD CONSTRAINT "user_magic_links_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;