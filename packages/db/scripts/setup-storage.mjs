/**
 * Idempotent setup for the source-documents Storage bucket.
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Bucket policy:
 *   - private (not public)
 *   - 50 MB per file
 *   - allowed mime types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document,
 *     text/plain, text/markdown, text/html
 *
 * RLS for storage.objects is enforced via a Postgres policy you can apply
 * via the Supabase dashboard; this script only ensures the bucket exists.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const BUCKET = 'source-documents'
const ALLOWED = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/html',
]

const { data: existing } = await admin.storage.getBucket(BUCKET).catch(() => ({ data: null }))
if (existing) {
  console.log(`bucket exists: ${BUCKET} (public=${existing.public})`)
  await admin.storage.updateBucket(BUCKET, {
    public: false,
    fileSizeLimit: 52428800,
    allowedMimeTypes: ALLOWED,
  })
  console.log('bucket updated')
} else {
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 52428800,
    allowedMimeTypes: ALLOWED,
  })
  if (error) {
    console.error('createBucket failed:', error.message)
    process.exit(1)
  }
  console.log(`bucket created: ${BUCKET}`)
}
