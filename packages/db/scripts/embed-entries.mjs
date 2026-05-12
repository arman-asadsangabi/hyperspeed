/**
 * One-shot script: embed pack_entries that don't yet have an embedding.
 * Run after publishing a version (or as a manual backfill).
 *
 * Env: DIRECT_DATABASE_URL, OPENAI_API_KEY, [LIMIT=100]
 */
import postgres from 'postgres'

const dbUrl = process.env.DIRECT_DATABASE_URL
const openaiKey = process.env.OPENAI_API_KEY
if (!dbUrl || !openaiKey) {
  console.error('Set DIRECT_DATABASE_URL and OPENAI_API_KEY')
  process.exit(1)
}
const LIMIT = Number(process.env.LIMIT ?? 100)

const sql = postgres(dbUrl, { prepare: false, max: 1, ssl: 'require', onnotice: () => {} })

async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.data[0].embedding
}

try {
  const rows = await sql`
    SELECT pe.id, pe.title, pe.content, pe.structured_data
    FROM pack_entries pe
    JOIN pack_versions pv ON pv.id = pe.pack_version_id
    WHERE pe.embedding IS NULL AND pv.status = 'published'
    LIMIT ${LIMIT}
  `
  console.log(`embedding ${rows.length} entries...`)
  let i = 0
  for (const e of rows) {
    const text = [e.title, e.content, e.structured_data ? JSON.stringify(e.structured_data) : '']
      .filter(Boolean)
      .join('\n\n')
    try {
      const vec = await embed(text)
      const vecLit = `[${vec.join(',')}]`
      await sql`
        UPDATE pack_entries
        SET embedding = ${vecLit}::vector,
            embedding_model = 'text-embedding-3-small',
            embedding_computed_at = now()
        WHERE id = ${e.id}
      `
      i++
      if (i % 10 === 0) console.log(`  ${i}/${rows.length}`)
    } catch (err) {
      console.error(`  failed ${e.id}:`, err.message)
    }
  }
  console.log(`done. embedded ${i}/${rows.length}`)
} finally {
  await sql.end({ timeout: 1 })
}
