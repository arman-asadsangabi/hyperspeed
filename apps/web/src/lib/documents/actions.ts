'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { sourceDocuments, type SourceDocument } from '@hyperspeed/db/schema'
import { db } from '../db'
import { hasRoleAtLeast, requireOrgContext } from '../auth/session'
import { createSupabaseServiceClient } from '../supabase/server'
import { withAudit } from '../audit'

const BUCKET = 'source-documents'
const MAX_FILE_SIZE = 50 * 1024 * 1024

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/html',
  ]),
  fileSizeBytes: z.number().int().positive().max(MAX_FILE_SIZE),
  packId: z.string().uuid().optional(),
})

export interface PresignResult {
  documentId: string
  uploadUrl: string
  storagePath: string
  token: string
}

/**
 * Step 1: create the source_documents row + a signed upload URL.
 * Caller PUTs the file bytes to `uploadUrl`, then calls completeUpload.
 */
export async function presignDocumentUpload(input: {
  filename: string
  mimeType: string
  fileSizeBytes: number
  packId?: string
}): Promise<PresignResult> {
  const ctx = await requireOrgContext()
  const parsed = presignSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.message)

  const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 200)
  const docId = crypto.randomUUID()
  const storagePath = `${ctx.organization.id}/${parsed.data.packId ?? 'unattached'}/${docId}/${safeName}`

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath)
  if (error) throw new Error(error.message)

  const [doc] = await db()
    .insert(sourceDocuments)
    .values({
      id: docId,
      organizationId: ctx.organization.id,
      packId: parsed.data.packId,
      uploadedBy: ctx.user.id,
      filename: parsed.data.filename,
      fileSizeBytes: parsed.data.fileSizeBytes,
      mimeType: parsed.data.mimeType,
      storagePath,
      textExtractionStatus: 'pending',
    })
    .returning()
  if (!doc) throw new Error('Failed to record document')

  return { documentId: docId, uploadUrl: data.signedUrl, storagePath, token: data.token }
}

/** Step 2: triggered after the client uploads bytes. Runs synchronous extraction. */
export async function completeDocumentUpload(documentId: string): Promise<void> {
  const ctx = await requireOrgContext()
  const [doc] = await db()
    .select()
    .from(sourceDocuments)
    .where(
      and(
        eq(sourceDocuments.id, documentId),
        eq(sourceDocuments.organizationId, ctx.organization.id),
      ),
    )
  if (!doc) throw new Error('Document not found')

  await db()
    .update(sourceDocuments)
    .set({ textExtractionStatus: 'processing' })
    .where(eq(sourceDocuments.id, documentId))

  try {
    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(doc.storagePath)
    if (error || !data) throw new Error(error?.message ?? 'Download failed')
    const buf = Buffer.from(await data.arrayBuffer())
    const text = await extractText(buf, doc.mimeType)

    await db()
      .update(sourceDocuments)
      .set({
        textExtractionStatus: 'completed',
        extractedText: text.slice(0, 5_000_000),
        processedAt: new Date(),
      })
      .where(eq(sourceDocuments.id, documentId))

    await withAudit(
      {
        organizationId: doc.organizationId,
        userId: ctx.user.id,
        ipAddress: await ip(),
        userAgent: await ua(),
      },
      {
        entityType: 'source_document',
        entityId: documentId,
        action: 'uploaded',
        afterState: {
          filename: doc.filename,
          sizeBytes: doc.fileSizeBytes,
          textChars: text.length,
        },
      },
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown extraction error'
    await db()
      .update(sourceDocuments)
      .set({ textExtractionStatus: 'failed', extractionError: msg })
      .where(eq(sourceDocuments.id, documentId))
  }

  revalidatePath('/dashboard/packs')
  if (doc.packId) revalidatePath(`/dashboard/packs/${doc.packId}`)
}

async function extractText(buf: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const mod = await import('pdf-parse')
    const pdf = (mod.default ?? mod) as (b: Buffer) => Promise<{ text: string }>
    const result = await pdf(buf)
    return result.text
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer: buf })
    return result.value
  }
  // text/plain, markdown, html
  return buf.toString('utf8')
}

export async function listDocumentsForPack(packId: string): Promise<SourceDocument[]> {
  const ctx = await requireOrgContext()
  return db()
    .select()
    .from(sourceDocuments)
    .where(
      and(
        eq(sourceDocuments.packId, packId),
        eq(sourceDocuments.organizationId, ctx.organization.id),
      ),
    )
    .orderBy(desc(sourceDocuments.createdAt))
}

export async function listOrgDocuments(): Promise<SourceDocument[]> {
  const ctx = await requireOrgContext()
  return db()
    .select()
    .from(sourceDocuments)
    .where(eq(sourceDocuments.organizationId, ctx.organization.id))
    .orderBy(desc(sourceDocuments.createdAt))
}

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  const ctx = await requireOrgContext()
  const [doc] = await db()
    .select()
    .from(sourceDocuments)
    .where(
      and(
        eq(sourceDocuments.id, documentId),
        eq(sourceDocuments.organizationId, ctx.organization.id),
      ),
    )
  if (!doc) throw new Error('Document not found')

  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storagePath, 60 * 5)
  if (error || !data) throw new Error(error?.message ?? 'Failed to sign URL')
  return data.signedUrl
}

export async function deleteDocument(documentId: string): Promise<void> {
  const ctx = await requireOrgContext()
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'))) {
    throw new Error('Only admins can delete documents')
  }
  const [doc] = await db()
    .select()
    .from(sourceDocuments)
    .where(
      and(
        eq(sourceDocuments.id, documentId),
        eq(sourceDocuments.organizationId, ctx.organization.id),
      ),
    )
  if (!doc) return

  const supabase = createSupabaseServiceClient()
  await supabase.storage
    .from(BUCKET)
    .remove([doc.storagePath])
    .catch(() => undefined)
  await db().delete(sourceDocuments).where(eq(sourceDocuments.id, documentId))

  await withAudit(
    {
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    {
      entityType: 'source_document',
      entityId: documentId,
      action: 'deleted',
      beforeState: { filename: doc.filename },
    },
  )

  revalidatePath('/dashboard/packs')
  if (doc.packId) revalidatePath(`/dashboard/packs/${doc.packId}`)
}

async function ip(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
async function ua(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent') ?? null
}
