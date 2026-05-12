'use server'

import { revalidatePath } from 'next/cache'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  designPartnerApplications,
  designPartnerProjects,
  projectMilestones,
  users,
  type DesignPartnerApplication,
  type Organization,
} from '@hyperspeed/db/schema'
import { db } from '../db'
import { requireSessionUser } from '../auth/session'
import { isPlatformAdmin } from '../creators/actions'

export interface ApplicationActionState {
  ok?: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

const applicationSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactName: z.string().max(120).optional(),
  targetDomain: z.string().max(120).optional(),
  useCase: z.string().max(5000).optional(),
  budgetRange: z.string().max(60).optional(),
  timeline: z.string().max(60).optional(),
  referralSource: z.string().max(120).optional(),
})

export async function submitDesignPartnerApplication(
  _prev: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const data = Object.fromEntries(formData.entries())
  for (const k of Object.keys(data)) if (data[k] === '') delete data[k as keyof typeof data]
  const parsed = applicationSchema.safeParse(data)
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  await db().insert(designPartnerApplications).values({
    companyName: parsed.data.companyName,
    contactEmail: parsed.data.contactEmail,
    contactName: parsed.data.contactName,
    targetDomain: parsed.data.targetDomain,
    useCase: parsed.data.useCase,
    budgetRange: parsed.data.budgetRange,
    timeline: parsed.data.timeline,
    referralSource: parsed.data.referralSource,
  })

  // TODO: send transactional email to hyperspeedsolutions@gmail.com via Resend
  // when RESEND_API_KEY is wired up (Stage 10).

  revalidatePath('/dashboard/admin/applications')
  return { ok: true }
}

export async function listApplications(): Promise<DesignPartnerApplication[]> {
  const u = await requireSessionUser()
  if (!(await isPlatformAdmin(u.id))) throw new Error('Platform admin only')
  return db()
    .select()
    .from(designPartnerApplications)
    .orderBy(desc(designPartnerApplications.createdAt))
}

export async function updateApplicationStatus(
  id: string,
  status: DesignPartnerApplication['status'],
  notes?: string,
): Promise<void> {
  const u = await requireSessionUser()
  if (!(await isPlatformAdmin(u.id))) throw new Error('Platform admin only')
  await db()
    .update(designPartnerApplications)
    .set({ status, notes, assignedTo: u.id })
    .where(eq(designPartnerApplications.id, id))
  revalidatePath('/dashboard/admin/applications')
}

void designPartnerProjects
void projectMilestones
void users
type DPA = DesignPartnerApplication
void ({} as DPA satisfies DPA)
type Org = Organization
void ({} as Org satisfies Org)
