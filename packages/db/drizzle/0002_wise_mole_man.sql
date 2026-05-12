CREATE TYPE "public"."entry_type" AS ENUM('fact', 'heuristic', 'decision_rule', 'example', 'citation', 'meta_rule');--> statement-breakpoint
CREATE TYPE "public"."pack_version_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pack_tags" (
	"pack_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category_id" uuid,
	"target_use_case" text,
	"cover_image_url" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pack_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"version_number" text NOT NULL,
	"status" "pack_version_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"changelog" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_entry_id" uuid NOT NULL,
	"citation_entry_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pack_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_version_id" uuid NOT NULL,
	"entry_type" "entry_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"structured_data" jsonb,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_tags" ADD CONSTRAINT "pack_tags_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_tags" ADD CONSTRAINT "pack_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_versions" ADD CONSTRAINT "pack_versions_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_versions" ADD CONSTRAINT "pack_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_citations" ADD CONSTRAINT "entry_citations_pack_entry_id_pack_entries_id_fk" FOREIGN KEY ("pack_entry_id") REFERENCES "public"."pack_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_citations" ADD CONSTRAINT "entry_citations_citation_entry_id_pack_entries_id_fk" FOREIGN KEY ("citation_entry_id") REFERENCES "public"."pack_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_entries" ADD CONSTRAINT "pack_entries_pack_version_id_pack_versions_id_fk" FOREIGN KEY ("pack_version_id") REFERENCES "public"."pack_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pack_tags_pk" ON "pack_tags" USING btree ("pack_id","tag_id");--> statement-breakpoint
CREATE INDEX "pack_tags_tag_idx" ON "pack_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "packs_org_slug_idx" ON "packs" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "packs_org_archived_idx" ON "packs" USING btree ("organization_id","is_archived");--> statement-breakpoint
CREATE INDEX "packs_category_idx" ON "packs" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pack_versions_pack_version_idx" ON "pack_versions" USING btree ("pack_id","version_number");--> statement-breakpoint
CREATE INDEX "pack_versions_pack_status_idx" ON "pack_versions" USING btree ("pack_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_citations_pk" ON "entry_citations" USING btree ("pack_entry_id","citation_entry_id");--> statement-breakpoint
CREATE INDEX "entry_citations_citation_idx" ON "entry_citations" USING btree ("citation_entry_id");--> statement-breakpoint
CREATE INDEX "pack_entries_version_order_idx" ON "pack_entries" USING btree ("pack_version_id","order_index");--> statement-breakpoint
CREATE INDEX "pack_entries_type_idx" ON "pack_entries" USING btree ("entry_type");