'use server'

import { and, eq } from 'drizzle-orm'
import { packEntries, packVersions, packs, categories } from '@hyperspeed/db/schema'
import { isAnthropicConfigured, runPackChatTurn, type TestChatTurn } from '@hyperspeed/eval'
import { db } from '../db'
import { requireOrgContext } from '../auth/session'

export interface TestChatReply {
  reply: string
  citedEntryIds: string[]
  configured: boolean
}

export async function chatAgainstVersion(
  versionId: string,
  history: TestChatTurn[],
  message: string,
): Promise<TestChatReply> {
  const ctx = await requireOrgContext()
  const [row] = await db()
    .select({ pack: packs, version: packVersions })
    .from(packVersions)
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(and(eq(packVersions.id, versionId), eq(packs.organizationId, ctx.organization.id)))
  if (!row) throw new Error('Not found')

  if (!isAnthropicConfigured()) {
    return {
      reply:
        '⚠️ AI test chat is unavailable. Set ANTHROPIC_API_KEY in the server environment to enable it.',
      citedEntryIds: [],
      configured: false,
    }
  }

  const entries = await db()
    .select({
      id: packEntries.id,
      entryType: packEntries.entryType,
      title: packEntries.title,
      content: packEntries.content,
    })
    .from(packEntries)
    .where(eq(packEntries.packVersionId, versionId))
    .orderBy(packEntries.orderIndex)

  const [cat] = row.pack.categoryId
    ? await db().select().from(categories).where(eq(categories.id, row.pack.categoryId))
    : []

  const result = await runPackChatTurn({
    domain: cat?.name ?? 'general',
    entries,
    history,
    message,
  })
  return { ...result, configured: true }
}
