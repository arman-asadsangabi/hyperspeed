import { auditLog } from '@hyperspeed/db/schema'
import { db } from './db'

export interface AuditContext {
  organizationId: string
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
}

export interface AuditEvent {
  entityType: string
  entityId: string
  action: string
  beforeState?: unknown
  afterState?: unknown
  metadata?: Record<string, unknown>
}

function computeDiff(
  before: unknown,
  after: unknown,
): Record<string, { before: unknown; after: unknown }> | null {
  if (before === undefined && after === undefined) return null
  if (before === undefined) return { '*': { before: null, after } }
  if (after === undefined) return { '*': { before, after: null } }
  if (
    typeof before !== 'object' ||
    typeof after !== 'object' ||
    before === null ||
    after === null
  ) {
    return { '*': { before, after } }
  }

  const diff: Record<string, { before: unknown; after: unknown }> = {}
  const beforeObj = before as Record<string, unknown>
  const afterObj = after as Record<string, unknown>
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])
  for (const key of keys) {
    if (key === 'updatedAt' || key === 'updated_at') continue
    if (JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])) {
      diff[key] = { before: beforeObj[key] ?? null, after: afterObj[key] ?? null }
    }
  }
  return Object.keys(diff).length === 0 ? null : diff
}

/**
 * Write an audit_log entry. Use right after a mutation succeeds.
 * Captures a diff if both beforeState and afterState are objects.
 *
 * @example
 *   const updated = await db.update(packs).set({ name }).returning()
 *   await withAudit(ctx, {
 *     entityType: 'pack', entityId: pack.id, action: 'updated',
 *     beforeState: existing, afterState: updated[0],
 *   })
 */
export async function withAudit(ctx: AuditContext, event: AuditEvent): Promise<void> {
  const diff = computeDiff(event.beforeState, event.afterState)
  await db()
    .insert(auditLog)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      diff,
      metadata: event.metadata ?? null,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })
}

/**
 * Wrap a mutation so audit is recorded even if it throws.
 * The error is re-thrown after the audit row is written.
 */
export async function withAuditWrap<T>(
  ctx: AuditContext,
  event: Omit<AuditEvent, 'afterState'>,
  run: () => Promise<T>,
  getAfterState?: (result: T) => unknown,
): Promise<T> {
  try {
    const result = await run()
    await withAudit(ctx, { ...event, afterState: getAfterState?.(result) })
    return result
  } catch (err) {
    await withAudit(ctx, {
      ...event,
      action: `${event.action}_failed`,
      metadata: {
        ...event.metadata,
        error: err instanceof Error ? err.message : String(err),
      },
    }).catch(() => {
      // Don't let an audit failure mask the underlying error.
    })
    throw err
  }
}
