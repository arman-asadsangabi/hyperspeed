import { sql } from 'drizzle-orm'
import { pgEnum, pgTable, uuid, text, integer, date, timestamp, index } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const applicationStatusEnum = pgEnum('dp_application_status', [
  'new',
  'in_discussion',
  'qualified',
  'closed_won',
  'closed_lost',
])

export const projectStatusEnum = pgEnum('dp_project_status', [
  'planning',
  'in_progress',
  'review',
  'completed',
  'cancelled',
])

export const ipTermsEnum = pgEnum('dp_ip_terms', [
  'customer_exclusive',
  'platform_licensed',
  'hybrid',
])

export const milestoneStatusEnum = pgEnum('dp_milestone_status', [
  'not_started',
  'in_progress',
  'review',
  'approved',
  'rejected',
])

export const milestonePaymentEnum = pgEnum('dp_milestone_payment', ['pending', 'invoiced', 'paid'])

export const projectRoleEnum = pgEnum('dp_project_role', [
  'project_manager',
  'sme',
  'customer_lead',
  'reviewer',
])

export const designPartnerApplications = pgTable(
  'design_partner_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyName: text('company_name').notNull(),
    contactEmail: text('contact_email').notNull(),
    contactName: text('contact_name'),
    targetDomain: text('target_domain'),
    useCase: text('use_case'),
    budgetRange: text('budget_range'),
    timeline: text('timeline'),
    referralSource: text('referral_source'),
    status: applicationStatusEnum('status').default('new').notNull(),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('dp_apps_status_idx').on(table.status),
    index('dp_apps_email_idx').on(table.contactEmail),
  ],
)

export const designPartnerProjects = pgTable(
  'design_partner_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerOrganizationId: uuid('customer_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id').references(() => designPartnerApplications.id, {
      onDelete: 'set null',
    }),
    projectName: text('project_name').notNull(),
    contractValueCents: integer('contract_value_cents').default(0).notNull(),
    startDate: date('start_date'),
    targetCompletionDate: date('target_completion_date'),
    status: projectStatusEnum('status').default('planning').notNull(),
    ipTerms: ipTermsEnum('ip_terms').default('hybrid').notNull(),
    exclusivityPeriodMonths: integer('exclusivity_period_months'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index('dp_projects_customer_idx').on(table.customerOrganizationId)],
)

export const projectMilestones = pgTable(
  'project_milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => designPartnerProjects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: date('due_date'),
    status: milestoneStatusEnum('status').default('not_started').notNull(),
    paymentAmountCents: integer('payment_amount_cents').default(0).notNull(),
    paymentStatus: milestonePaymentEnum('payment_status').default('pending').notNull(),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index('dp_milestones_project_idx').on(table.projectId)],
)

export const projectTeamMembers = pgTable('project_team_members', {
  projectId: uuid('project_id')
    .notNull()
    .references(() => designPartnerProjects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: projectRoleEnum('role').notNull(),
})

export type DesignPartnerApplication = typeof designPartnerApplications.$inferSelect
export type DesignPartnerProject = typeof designPartnerProjects.$inferSelect
export type ProjectMilestone = typeof projectMilestones.$inferSelect
