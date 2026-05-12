CREATE TYPE "public"."proposal_confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('pending_review', 'accepted', 'edited', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."lint_check_type" AS ENUM('vague_claim', 'missing_citation', 'outdated_date', 'contradiction', 'coverage_gap');--> statement-breakpoint
CREATE TYPE "public"."lint_severity" AS ENUM('info', 'warning', 'error');--> statement-breakpoint
CREATE TABLE "proposed_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_version_id" uuid NOT NULL,
	"source_document_id" uuid,
	"entry_type" "entry_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"structured_data" jsonb,
	"confidence" "proposal_confidence" DEFAULT 'medium' NOT NULL,
	"source_excerpt" text,
	"suggested_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "proposal_status" DEFAULT 'pending_review' NOT NULL,
	"accepted_as_entry_id" uuid,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lint_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_version_id" uuid NOT NULL,
	"entry_id" uuid,
	"check_type" "lint_check_type" NOT NULL,
	"severity" "lint_severity" DEFAULT 'warning' NOT NULL,
	"message" text NOT NULL,
	"suggested_fix" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposed_entries" ADD CONSTRAINT "proposed_entries_pack_version_id_pack_versions_id_fk" FOREIGN KEY ("pack_version_id") REFERENCES "public"."pack_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposed_entries" ADD CONSTRAINT "proposed_entries_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposed_entries" ADD CONSTRAINT "proposed_entries_accepted_as_entry_id_pack_entries_id_fk" FOREIGN KEY ("accepted_as_entry_id") REFERENCES "public"."pack_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lint_results" ADD CONSTRAINT "lint_results_pack_version_id_pack_versions_id_fk" FOREIGN KEY ("pack_version_id") REFERENCES "public"."pack_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lint_results" ADD CONSTRAINT "lint_results_entry_id_pack_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."pack_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposed_entries_version_idx" ON "proposed_entries" USING btree ("pack_version_id");--> statement-breakpoint
CREATE INDEX "proposed_entries_status_idx" ON "proposed_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lint_results_version_resolved_idx" ON "lint_results" USING btree ("pack_version_id","resolved");--> statement-breakpoint
CREATE INDEX "lint_results_check_idx" ON "lint_results" USING btree ("check_type");