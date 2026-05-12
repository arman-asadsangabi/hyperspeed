/**
 * End-to-end smoke test for Phase 1.2 schema + Phase 1.4 audit logging.
 * Creates a temp auth user, exercises the trigger and tables, then cleans up.
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
let userId, orgId

function ok(label, value) {
  console.log(`✓ ${label}: ${value}`)
}
function fail(label, err) {
  console.log(`✗ ${label}: ${err?.message || err}`)
  process.exitCode = 1
}

try {
  // 1. Create auth user via Supabase Admin API
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: 'TempPassword!23',
    email_confirm: true,
    user_metadata: { full_name: 'Smoke Test' },
  })
  if (createErr) throw createErr
  userId = created.user.id
  ok('auth.users insert', userId)

  // 2. Verify trigger mirrored to public.users
  const [mirrored] = await sql`SELECT id, email, full_name FROM users WHERE id = ${userId}`
  if (!mirrored) fail('public.users mirror', 'no row appeared')
  else ok('public.users mirror', `email=${mirrored.email} name=${mirrored.full_name}`)

  // 3. Create an organization (simulates the createOrganization action)
  const [org] = await sql`
    INSERT INTO organizations (name, slug, billing_email)
    VALUES ('Smoke Test Org', ${'smoke-test-' + Date.now()}, ${email})
    RETURNING *
  `
  orgId = org.id
  ok('organizations insert', `${org.name} (${org.slug})`)

  // 4. Add the user as owner
  const [member] = await sql`
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (${orgId}, ${userId}, 'owner')
    RETURNING *
  `
  ok('organization_members insert', `role=${member.role}`)

  // 5. Write an audit row (simulates withAudit)
  await sql`
    INSERT INTO audit_log (organization_id, user_id, entity_type, entity_id, action, diff)
    VALUES (${orgId}, ${userId}, 'organization', ${orgId}, 'created', ${sql.json({ created: { before: null, after: org.name } })})
  `
  const [audit] = await sql`SELECT * FROM audit_log WHERE entity_id = ${orgId} LIMIT 1`
  ok('audit_log insert + read', `${audit.action} on ${audit.entity_type}`)

  // 6. Exercise the RLS helper function
  const [check] = await sql`SELECT public.has_role_at_least(${orgId}::uuid, 'owner') AS r`
  // Note: SECURITY DEFINER + service role context — function should work but
  // auth.uid() returns null in this connection. We just verify it executes.
  ok('has_role_at_least() callable', `returned ${check.r}`)

  // 7. updated_at trigger fires
  const before = org.updated_at
  await new Promise((r) => setTimeout(r, 10))
  await sql`UPDATE organizations SET name = 'Smoke Test Org (renamed)' WHERE id = ${orgId}`
  const [after] = await sql`SELECT updated_at FROM organizations WHERE id = ${orgId}`
  if (after.updated_at <= before) fail('updated_at trigger', 'did not advance')
  else ok('updated_at trigger', `advanced by ${after.updated_at - before}ms`)
} catch (e) {
  fail('exception', e)
} finally {
  // Cleanup
  if (orgId) await sql`DELETE FROM organizations WHERE id = ${orgId}`.catch(() => {})
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {})
  await sql.end({ timeout: 1 })
}

if (!process.exitCode) console.log('\nALL CHECKS PASSED ✅')
