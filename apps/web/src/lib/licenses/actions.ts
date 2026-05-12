'use server'

import { and, eq, or } from 'drizzle-orm'
import {
  licenses,
  packs,
  organizations,
  packVersions,
  type License,
  type Pack,
} from '@hyperspeed/db/schema'
import { db } from '../db'
import { requireOrgContext } from '../auth/session'

export interface LicensedPackRow {
  license: License
  pack: Pack
  licensorName: string
}

export async function listIncomingLicenses(): Promise<LicensedPackRow[]> {
  const ctx = await requireOrgContext()
  const rows = await db()
    .select({
      license: licenses,
      pack: packs,
      licensorName: organizations.name,
    })
    .from(licenses)
    .leftJoin(packs, eq(licenses.packId, packs.id))
    .innerJoin(organizations, eq(licenses.licensorOrganizationId, organizations.id))
    .where(eq(licenses.licenseeOrganizationId, ctx.organization.id))
  return rows
    .filter((r): r is LicensedPackRow => r.pack !== null)
    .map((r) => ({ license: r.license, pack: r.pack as Pack, licensorName: r.licensorName }))
}

export async function listOutgoingLicenses(): Promise<LicensedPackRow[]> {
  const ctx = await requireOrgContext()
  const rows = await db()
    .select({ license: licenses, pack: packs, licensorName: organizations.name })
    .from(licenses)
    .leftJoin(packs, eq(licenses.packId, packs.id))
    .innerJoin(organizations, eq(licenses.licenseeOrganizationId, organizations.id))
    .where(eq(licenses.licensorOrganizationId, ctx.organization.id))
  return rows
    .filter((r): r is LicensedPackRow => r.pack !== null)
    .map((r) => ({ license: r.license, pack: r.pack as Pack, licensorName: r.licensorName }))
}

export async function listAvailablePacks(): Promise<{ pack: Pack; orgName: string }[]> {
  // Packs from OTHER orgs that have at least one published version
  const ctx = await requireOrgContext()
  const rows = await db()
    .select({ pack: packs, orgName: organizations.name })
    .from(packs)
    .innerJoin(organizations, eq(packs.organizationId, organizations.id))
    .innerJoin(packVersions, eq(packVersions.packId, packs.id))
    .where(
      and(
        eq(packVersions.status, 'published'),
        or(...[ctx.organization.id].map((id) => eq(packs.organizationId, id))) /* placeholder */,
      ),
    )
    .limit(100)
  // Filter to OTHER orgs
  return rows.filter((r) => r.pack.organizationId !== ctx.organization.id)
}
