CREATE TYPE "public"."credential_type" AS ENUM('professional_license', 'employment', 'academic_degree', 'certification', 'publication');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected', 'expired');--> statement-breakpoint
CREATE TABLE "creator_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text,
	"bio" text,
	"professional_summary" text,
	"years_experience" integer,
	"linkedin_url" text,
	"personal_website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_profile_id" uuid NOT NULL,
	"credential_type" "credential_type" NOT NULL,
	"title" text NOT NULL,
	"issuing_organization" text NOT NULL,
	"license_number" text,
	"issue_date" date,
	"expiration_date" date,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verification_source" text,
	"verification_notes" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"supporting_document_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_platform_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_creator_profile_id_creator_profiles_id_fk" FOREIGN KEY ("creator_profile_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_profiles_user_idx" ON "creator_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credentials_profile_idx" ON "credentials" USING btree ("creator_profile_id");--> statement-breakpoint
CREATE INDEX "credentials_status_idx" ON "credentials" USING btree ("verification_status");