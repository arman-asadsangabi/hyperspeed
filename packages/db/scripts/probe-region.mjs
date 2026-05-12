/**
 * Find which Supabase pooler region holds the project by trying each in
 * parallel. The pooler returns "Tenant or user not found" when the project
 * ref isn't in that region, vs. a normal auth challenge when it IS.
 *
 * Usage: node probe-region.mjs   (reads DB_PASSWORD + PROJECT_REF from env)
 */
import postgres from 'postgres'

const REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'sa-east-1',
  'ca-central-1',
]

const ref = process.env.PROJECT_REF
const pwd = process.env.DB_PASSWORD
if (!ref || !pwd) {
  console.error('Set PROJECT_REF and DB_PASSWORD env vars')
  process.exit(1)
}

async function probe(region) {
  const host = `aws-1-${region}.pooler.supabase.com`
  const sql = postgres({
    host,
    port: 6543,
    user: `postgres.${ref}`,
    password: pwd,
    database: 'postgres',
    ssl: 'require',
    connect_timeout: 6,
    max: 1,
    prepare: false,
    onnotice: () => undefined,
  })
  try {
    const r = await sql`select current_database() as db`
    await sql.end({ timeout: 1 })
    return { region, ok: true, db: r[0].db }
  } catch (e) {
    await sql.end({ timeout: 0 }).catch(() => undefined)
    return { region, ok: false, code: e.code || '', message: (e.message || '').slice(0, 120) }
  }
}

const results = await Promise.all(REGIONS.map(probe))
for (const r of results) {
  if (r.ok) console.log(`✓ ${r.region.padEnd(16)} CONNECTED (${r.db})`)
  else console.log(`✗ ${r.region.padEnd(16)} ${r.code || '(no code)'}  ${r.message}`)
}
const winner = results.find((r) => r.ok)
if (winner) {
  console.log(`\nREGION=${winner.region}`)
} else {
  console.log('\nNo region matched.')
  process.exit(2)
}
