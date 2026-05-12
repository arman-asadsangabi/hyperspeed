'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import { createPackSchema, updatePackSchema } from '@hyperspeed/shared/schemas'
import { packs, packVersions, categories } from '@hyperspeed/db/schema'
import { db } from '../db'
import { requireOrgContext, hasRoleAtLeast } from '../auth/session'
import { withAudit } from '../audit'

export interface PackActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function listMyPacks(filters?: {
  archived?: boolean
  categoryId?: string
  q?: string
}) {
  const ctx = await requireOrgContext()
  const whereClauses = [eq(packs.organizationId, ctx.organization.id)]
  if (filters?.archived !== undefined) whereClauses.push(eq(packs.isArchived, filters.archived))
  if (filters?.categoryId) whereClauses.push(eq(packs.categoryId, filters.categoryId))
  if (filters?.q) whereClauses.push(ilike(packs.name, `%${filters.q}%`))

  return db()
    .select({
      pack: packs,
      category: categories,
    })
    .from(packs)
    .leftJoin(categories, eq(packs.categoryId, categories.id))
    .where(and(...whereClauses))
    .orderBy(desc(packs.updatedAt))
}

export async function listCategories() {
  return db().select().from(categories).orderBy(categories.name)
}

export async function getPack(packId: string) {
  const ctx = await requireOrgContext()
  const [row] = await db()
    .select({ pack: packs, category: categories })
    .from(packs)
    .leftJoin(categories, eq(packs.categoryId, categories.id))
    .where(and(eq(packs.id, packId), eq(packs.organizationId, ctx.organization.id)))
  if (!row) return null

  const versions = await db()
    .select()
    .from(packVersions)
    .where(eq(packVersions.packId, packId))
    .orderBy(desc(packVersions.createdAt))

  return { ...row, versions }
}

export async function createPack(
  _prev: PackActionState,
  formData: FormData,
): Promise<PackActionState> {
  const ctx = await requireOrgContext()
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'))) {
    return { error: 'Only admins can create packs' }
  }

  const parsed = createPackSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') || undefined,
    categoryId: formData.get('categoryId') || undefined,
    targetUseCase: formData.get('targetUseCase') || undefined,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  let newPackId: string
  try {
    newPackId = await db().transaction(async (tx) => {
      const [pack] = await tx
        .insert(packs)
        .values({
          organizationId: ctx.organization.id,
          name: parsed.data.name,
          slug: parsed.data.slug,
          description: parsed.data.description,
          categoryId: parsed.data.categoryId,
          targetUseCase: parsed.data.targetUseCase,
          createdBy: ctx.user.id,
        })
        .returning()
      if (!pack) throw new Error('Insert returned no row')

      await tx.insert(packVersions).values({
        packId: pack.id,
        versionNumber: '0.1.0',
        status: 'draft',
        createdBy: ctx.user.id,
      })
      return pack.id
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('packs_org_slug_idx')) {
      return { fieldErrors: { slug: ['A pack with that slug already exists in this org'] } }
    }
    return { error: message }
  }

  await withAudit(
    {
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      ipAddress: await getRequestIp(),
      userAgent: await getRequestUserAgent(),
    },
    {
      entityType: 'pack',
      entityId: newPackId,
      action: 'created',
      afterState: parsed.data,
    },
  )

  revalidatePath('/dashboard/packs')
  redirect(`/dashboard/packs/${newPackId}`)
}

export async function updatePack(
  packId: string,
  _prev: PackActionState,
  formData: FormData,
): Promise<PackActionState> {
  const ctx = await requireOrgContext()
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'))) {
    return { error: 'Only admins can edit packs' }
  }

  const parsed = updatePackSchema.safeParse({
    name: formData.get('name') || undefined,
    slug: formData.get('slug') || undefined,
    description: formData.get('description') || undefined,
    categoryId: formData.get('categoryId') || undefined,
    targetUseCase: formData.get('targetUseCase') || undefined,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const [existing] = await db()
    .select()
    .from(packs)
    .where(and(eq(packs.id, packId), eq(packs.organizationId, ctx.organization.id)))
  if (!existing) return { error: 'Pack not found' }

  const [updated] = await db()
    .update(packs)
    .set({ ...parsed.data, updatedAt: sql`now()` })
    .where(eq(packs.id, packId))
    .returning()

  if (!updated) return { error: 'Update returned no row' }

  await withAudit(
    {
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      ipAddress: await getRequestIp(),
      userAgent: await getRequestUserAgent(),
    },
    {
      entityType: 'pack',
      entityId: packId,
      action: 'updated',
      beforeState: existing,
      afterState: updated,
    },
  )

  revalidatePath(`/dashboard/packs/${packId}`)
  revalidatePath('/dashboard/packs')
  return {}
}

export async function archivePack(packId: string): Promise<void> {
  const ctx = await requireOrgContext()
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'))) {
    throw new Error('Only admins can archive packs')
  }

  const [existing] = await db()
    .select()
    .from(packs)
    .where(and(eq(packs.id, packId), eq(packs.organizationId, ctx.organization.id)))
  if (!existing) throw new Error('Pack not found')

  await db().update(packs).set({ isArchived: true }).where(eq(packs.id, packId))

  await withAudit(
    {
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      ipAddress: await getRequestIp(),
      userAgent: await getRequestUserAgent(),
    },
    {
      entityType: 'pack',
      entityId: packId,
      action: 'archived',
      beforeState: existing,
    },
  )

  revalidatePath('/dashboard/packs')
  redirect('/dashboard/packs')
}

export async function unarchivePack(packId: string): Promise<void> {
  const ctx = await requireOrgContext()
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'))) {
    throw new Error('Only admins can restore packs')
  }
  await db()
    .update(packs)
    .set({ isArchived: false })
    .where(and(eq(packs.id, packId), eq(packs.organizationId, ctx.organization.id)))

  await withAudit(
    {
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      ipAddress: await getRequestIp(),
      userAgent: await getRequestUserAgent(),
    },
    {
      entityType: 'pack',
      entityId: packId,
      action: 'unarchived',
    },
  )
  revalidatePath('/dashboard/packs')
}

async function getRequestIp(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
}

async function getRequestUserAgent(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent') ?? null
}
