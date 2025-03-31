CREATE TYPE "public"."embedding_source_type" AS ENUM('answer', 'insight');--> statement-breakpoint
CREATE TABLE "embeddings" (
	"embedding_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"embedding" vector(2048) NOT NULL,
	"source_type" "embedding_source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"text_content" text NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"is_chunked" boolean DEFAULT false NOT NULL,
	"model_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_embeddings_tenant" ON "embeddings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_embeddings_source" ON "embeddings" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_embeddings" ON "embeddings" USING ivfflat ("embedding" vector_cosine_ops);