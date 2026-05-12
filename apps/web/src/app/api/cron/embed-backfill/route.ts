import { NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { packEntries, packVersions } from '@hyperspeed/db/schema'
import { db } from '@/lib/db'
import { captureException } from '@/lib/observability'

export const dynamic = 'force-dynamic'

const BATCH = 50

/**
 * Phase 5.3 embedding backfill cron.
 * Picks BATCH entries on published versions that don't yet have an embedding,
 * runs them through OpenAI, and writes the vectors back. Idempotent; safe to
 * run frequently.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? ''}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ ok: true, skipped: 'OPENAI_API_KEY not set' })

  try {
    const rows = await db()
      .select({
        id: packEntries.id,
        title: packEntries.title,
        content: packEntries.content,
        structuredData: packEntries.structuredData,
      })
      .from(packEntries)
      .innerJoin(packVersions, eq(packVersions.id, packEntries.packVersionId))
      .where(and(sql`pack_entries.embedding IS NULL`, eq(packVersions.status, 'published')))
      .limit(BATCH)

    let embedded = 0
    for (const e of rows) {
      const text = [e.title, e.content, e.structuredData ? JSON.stringify(e.structuredData) : '']
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 8000)
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
      })
      if (!res.ok) continue
      const json = (await res.json()) as { data?: { embedding: number[] }[] }
      const vec = json.data?.[0]?.embedding
      if (!vec) continue
      const lit = `[${vec.join(',')}]`
      await db().execute(sql`
        UPDATE pack_entries
        SET embedding = ${lit}::vector,
            embedding_model = 'text-embedding-3-small',
            embedding_computed_at = now()
        WHERE id = ${e.id}
      `)
      embedded++
    }

    return NextResponse.json({ ok: true, candidates: rows.length, embedded })
  } catch (err) {
    await captureException(err, { extra: { job: 'embed-backfill' } })
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'cron failed' },
      { status: 500 },
    )
  }
}
