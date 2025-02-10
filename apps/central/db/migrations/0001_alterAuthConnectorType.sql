CREATE TABLE "auth_connector_domains" (
	"auth_connector_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth_connector_domains" ADD CONSTRAINT "auth_connector_domains_auth_connector_id_auth_connectors_auth_connector_id_fk" FOREIGN KEY ("auth_connector_id") REFERENCES "public"."auth_connectors"("auth_connector_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_connectors" DROP COLUMN "type";--> statement-breakpoint
DROP TYPE "public"."auth_connector_type";