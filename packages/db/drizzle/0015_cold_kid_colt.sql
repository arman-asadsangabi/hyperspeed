CREATE TYPE "public"."license_status" AS ENUM('pending', 'active', 'paused', 'expired', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."license_type" AS ENUM('subscription', 'one_time', 'enterprise_unlimited');--> statement-breakpoint
CREATE TYPE "public"."sla_tier" AS ENUM('standard', 'priority', 'dedicated');--> statement-breakpoint
CREATE TYPE "public"."dp_application_status" AS ENUM('new', 'in_discussion', 'qualified', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TYPE "public"."dp_ip_terms" AS ENUM('customer_exclusive', 'platform_licensed', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."dp_milestone_payment" AS ENUM('pending', 'invoiced', 'paid');--> statement-breakpoint
CREATE TYPE "public"."dp_milestone_status" AS ENUM('not_started', 'in_progress', 'review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."dp_project_role" AS ENUM('project_manager', 'sme', 'customer_lead', 'reviewer');--> statement-breakpoint
CREATE TYPE "public"."dp_project_status" AS ENUM('planning', 'in_progress', 'review', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "bundle_packs" (
	"bundle_id" uuid NOT NULL,
	"pack_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by_organization_id" uuid,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"licensee_organization_id" uuid NOT NULL,
	"licensor_organization_id" uuid NOT NULL,
	"pack_id" uuid,
	"bundle_id" uuid,
	"license_type" "license_type" DEFAULT 'subscription' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"seats" integer,
	"monthly_query_limit" integer,
	"sla_tier" "sla_tier" DEFAULT 'standard' NOT NULL,
	"terms" jsonb,
	"status" "license_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_partner_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_name" text,
	"target_domain" text,
	"use_case" text,
	"budget_range" text,
	"timeline" text,
	"referral_source" text,
	"status" "dp_application_status" DEFAULT 'new' NOT NULL,
	"assigned_to" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_partner_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_organization_id" uuid NOT NULL,
	"application_id" uuid,
	"project_name" text NOT NULL,
	"contract_value_cents" integer DEFAULT 0 NOT NULL,
	"start_date" date,
	"target_completion_date" date,
	"status" "dp_project_status" DEFAULT 'planning' NOT NULL,
	"ip_terms" "dp_ip_terms" DEFAULT 'hybrid' NOT NULL,
	"exclusivity_period_months" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" date,
	"status" "dp_milestone_status" DEFAULT 'not_started' NOT NULL,
	"payment_amount_cents" integer DEFAULT 0 NOT NULL,
	"payment_status" "dp_milestone_payment" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_team_members" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "dp_project_role" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_code" text NOT NULL,
	"email" text,
	"target_domain" text,
	"invited_by" uuid,
	"accepted_by" uuid,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_invitations_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "creator_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"gross_revenue_cents" integer DEFAULT 0 NOT NULL,
	"platform_fee_cents" integer DEFAULT 0 NOT NULL,
	"net_payout_cents" integer DEFAULT 0 NOT NULL,
	"stripe_transfer_id" text,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bundle_packs" ADD CONSTRAINT "bundle_packs_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_packs" ADD CONSTRAINT "bundle_packs_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_created_by_organization_id_organizations_id_fk" FOREIGN KEY ("created_by_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_licensee_organization_id_organizations_id_fk" FOREIGN KEY ("licensee_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_licensor_organization_id_organizations_id_fk" FOREIGN KEY ("licensor_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_partner_applications" ADD CONSTRAINT "design_partner_applications_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_partner_projects" ADD CONSTRAINT "design_partner_projects_customer_organization_id_organizations_id_fk" FOREIGN KEY ("customer_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_partner_projects" ADD CONSTRAINT "design_partner_projects_application_id_design_partner_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."design_partner_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_design_partner_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."design_partner_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_project_id_design_partner_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."design_partner_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_invitations" ADD CONSTRAINT "creator_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_invitations" ADD CONSTRAINT "creator_invitations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "licenses_licensee_idx" ON "licenses" USING btree ("licensee_organization_id","status");--> statement-breakpoint
CREATE INDEX "licenses_licensor_idx" ON "licenses" USING btree ("licensor_organization_id");--> statement-breakpoint
CREATE INDEX "licenses_pack_idx" ON "licenses" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX "dp_apps_status_idx" ON "design_partner_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dp_apps_email_idx" ON "design_partner_applications" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "dp_projects_customer_idx" ON "design_partner_projects" USING btree ("customer_organization_id");--> statement-breakpoint
CREATE INDEX "dp_milestones_project_idx" ON "project_milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "creator_invitations_code_idx" ON "creator_invitations" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "creator_invitations_email_idx" ON "creator_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "creator_payouts_creator_period_idx" ON "creator_payouts" USING btree ("creator_user_id","period_start");