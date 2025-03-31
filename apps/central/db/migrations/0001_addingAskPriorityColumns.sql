ALTER TABLE "asks" ADD COLUMN "is_blocking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "asks" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "asks" ADD COLUMN "expires_at" timestamp with time zone;