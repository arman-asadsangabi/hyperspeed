CREATE TYPE "public"."doc_extraction_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"pack_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"filename" text NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"extracted_text" text,
	"text_extraction_status" "doc_extraction_status" DEFAULT 'pending' NOT NULL,
	"extraction_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_docs_org_idx" ON "source_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "source_docs_pack_idx" ON "source_documents" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX "source_docs_status_idx" ON "source_documents" USING btree ("text_extraction_status");