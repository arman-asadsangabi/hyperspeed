CREATE TYPE "public"."eval_alert_type" AS ENUM('score_drop', 'critical_failure', 'test_set_updated');--> statement-breakpoint
CREATE TYPE "public"."eval_run_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."test_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TABLE "eval_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"pack_version_id" uuid,
	"alert_type" "eval_alert_type" NOT NULL,
	"previous_score" numeric(5, 2),
	"current_score" numeric(5, 2),
	"score_delta" numeric(5, 2),
	"message" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eval_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eval_run_id" uuid NOT NULL,
	"test_case_id" uuid NOT NULL,
	"response" text NOT NULL,
	"citations_used" text[] DEFAULT '{}'::text[] NOT NULL,
	"judge_scores" jsonb,
	"judge_reasoning" text,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eval_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_version_id" uuid NOT NULL,
	"test_set_id" uuid NOT NULL,
	"model_name" text NOT NULL,
	"judge_model" text NOT NULL,
	"status" "eval_run_status" DEFAULT 'pending' NOT NULL,
	"overall_score" numeric(5, 2),
	"dimension_scores" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_set_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"expected_topics" text[] DEFAULT '{}'::text[] NOT NULL,
	"expected_citations" text[] DEFAULT '{}'::text[] NOT NULL,
	"difficulty" "test_difficulty" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_alerts" ADD CONSTRAINT "eval_alerts_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_alerts" ADD CONSTRAINT "eval_alerts_pack_version_id_pack_versions_id_fk" FOREIGN KEY ("pack_version_id") REFERENCES "public"."pack_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_alerts" ADD CONSTRAINT "eval_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_results" ADD CONSTRAINT "eval_results_eval_run_id_eval_runs_id_fk" FOREIGN KEY ("eval_run_id") REFERENCES "public"."eval_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_results" ADD CONSTRAINT "eval_results_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_runs" ADD CONSTRAINT "eval_runs_pack_version_id_pack_versions_id_fk" FOREIGN KEY ("pack_version_id") REFERENCES "public"."pack_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_runs" ADD CONSTRAINT "eval_runs_test_set_id_test_sets_id_fk" FOREIGN KEY ("test_set_id") REFERENCES "public"."test_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_runs" ADD CONSTRAINT "eval_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_test_set_id_test_sets_id_fk" FOREIGN KEY ("test_set_id") REFERENCES "public"."test_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sets" ADD CONSTRAINT "test_sets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eval_alerts_pack_resolved_idx" ON "eval_alerts" USING btree ("pack_id","resolved");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_alerts_unique_unresolved" ON "eval_alerts" USING btree ("pack_id","alert_type") WHERE resolved = false;--> statement-breakpoint
CREATE INDEX "eval_results_run_idx" ON "eval_results" USING btree ("eval_run_id");--> statement-breakpoint
CREATE INDEX "eval_runs_version_idx" ON "eval_runs" USING btree ("pack_version_id","created_at");--> statement-breakpoint
CREATE INDEX "eval_runs_set_idx" ON "eval_runs" USING btree ("test_set_id");--> statement-breakpoint
CREATE INDEX "test_cases_set_idx" ON "test_cases" USING btree ("test_set_id");--> statement-breakpoint
CREATE INDEX "test_sets_category_idx" ON "test_sets" USING btree ("category_id");