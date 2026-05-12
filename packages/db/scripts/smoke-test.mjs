/**
 * End-to-end smoke test for Stage 1 + Stage 2 schema.
 * Creates a temp auth user, exercises every table that has tests, cleans up.
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DIRECT_DATABASE_URL
 */
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbUrl = process.env.DIRECT_DATABASE_URL
if (!url || !serviceKey || !dbUrl) {
  console.error('Missing env vars')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const sql = postgres(dbUrl, { prepare: false, max: 1, ssl: 'require', onnotice: () => {} })

const email = `smoke-${Date.now()}@hyperspeed-test.local`
let userId, orgId, packId, versionId, entryId

function ok(label, value) {
  console.log(`✓ ${label}: ${value}`)
}
function fail(label, err) {
  console.log(`✗ ${label}: ${err?.message || err}`)
  process.exitCode = 1
}

try {
  // === Stage 1: auth + multi-tenancy + audit ===
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: 'TempPassword!23',
    email_confirm: true,
    user_metadata: { full_name: 'Smoke Test' },
  })
  if (createErr) throw createErr
  userId = created.user.id
  ok('auth.users insert', userId)

  const [mirrored] = await sql`SELECT id, email FROM users WHERE id = ${userId}`
  if (!mirrored) fail('public.users mirror', 'no row appeared')
  else ok('public.users mirror', mirrored.email)

  const [org] = await sql`
    INSERT INTO organizations (name, slug, billing_email)
    VALUES ('Smoke Test Org', ${'smoke-' + Date.now()}, ${email})
    RETURNING *
  `
  orgId = org.id
  ok('organizations insert', org.name)

  await sql`
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (${orgId}, ${userId}, 'owner')
  `
  ok('organization_members insert', 'owner')

  await sql`
    INSERT INTO audit_log (organization_id, user_id, entity_type, entity_id, action)
    VALUES (${orgId}, ${userId}, 'organization', ${orgId}, 'created')
  `
  ok('audit_log insert', 'organization.created')

  // === Stage 2 Phase 2.1: packs + versions + categories ===
  const [taxCat] = await sql`SELECT id, name FROM categories WHERE slug = 'tax'`
  if (!taxCat) fail('category seed', 'tax category missing')
  else ok('category seed', `${taxCat.name} loaded`)

  const [pack] = await sql`
    INSERT INTO packs (organization_id, name, slug, description, category_id, created_by)
    VALUES (${orgId}, 'Smoke CPA Pack', 'smoke-cpa', 'test pack', ${taxCat.id}, ${userId})
    RETURNING *
  `
  packId = pack.id
  ok('packs insert', `${pack.name} (slug=${pack.slug})`)

  // Unique constraint: same slug in same org should fail
  let duplicateBlocked = false
  try {
    await sql`
      INSERT INTO packs (organization_id, name, slug, created_by)
      VALUES (${orgId}, 'Duplicate', 'smoke-cpa', ${userId})
    `
  } catch {
    duplicateBlocked = true
  }
  if (!duplicateBlocked) fail('unique (org_id, slug) constraint', 'duplicate succeeded')
  else ok('unique (org_id, slug) constraint', 'rejected duplicate')

  const [version] = await sql`
    INSERT INTO pack_versions (pack_id, version_number, status, created_by)
    VALUES (${pack.id}, '0.1.0', 'draft', ${userId})
    RETURNING *
  `
  versionId = version.id
  ok('pack_versions insert', `v${version.version_number} status=${version.status}`)

  const [entry] = await sql`
    INSERT INTO pack_entries (pack_version_id, entry_type, title, content, tags, order_index)
    VALUES (${version.id}, 'fact', 'Section 179 limit',
            'In 2026 the limit is $1.16M with phase-out at $2.89M.',
            ARRAY['tax', '2026']::text[], 0)
    RETURNING *
  `
  entryId = entry.id
  ok('pack_entries insert', `type=${entry.entry_type} title="${entry.title}"`)

  // updated_at trigger on packs
  const before = pack.updated_at
  await new Promise((r) => setTimeout(r, 10))
  await sql`UPDATE packs SET description = 'edited' WHERE id = ${pack.id}`
  const [aftRow] = await sql`SELECT updated_at FROM packs WHERE id = ${pack.id}`
  if (aftRow.updated_at <= before) fail('packs updated_at trigger', 'did not advance')
  else ok('packs updated_at trigger', 'advanced')

  // Cascade test: delete pack → version + entries cleared
  await sql`DELETE FROM packs WHERE id = ${pack.id}`
  const orphanVersions = await sql`SELECT 1 FROM pack_versions WHERE id = ${versionId}`
  const orphanEntries = await sql`SELECT 1 FROM pack_entries WHERE id = ${entryId}`
  if (orphanVersions.length || orphanEntries.length) fail('pack cascade delete', 'orphans remained')
  else ok('pack cascade delete', 'versions + entries cleaned up')
  packId = null
} catch (e) {
  fail('exception', e)
} finally {
  if (packId) await sql`DELETE FROM packs WHERE id = ${packId}`.catch(() => {})
  if (orgId) await sql`DELETE FROM organizations WHERE id = ${orgId}`.catch(() => {})
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {})
  await sql.end({ timeout: 1 })
}

if (!process.exitCode) console.log('\nALL CHECKS PASSED ✅')
