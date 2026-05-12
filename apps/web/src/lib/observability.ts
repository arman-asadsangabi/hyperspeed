/**
 * Lightweight observability glue. No-op when env vars aren't set, so
 * call sites don't need to branch.
 *
 * When SENTRY_DSN is configured, install @sentry/nextjs as a real dep:
 *   pnpm add @sentry/nextjs
 * Then update this file to forward to it. We avoid a top-level import
 * here so a missing dep doesn't break dev builds.
 */

interface CaptureContext {
  user?: { id?: string; email?: string }
  organization?: { id?: string; name?: string }
  extra?: Record<string, unknown>
}

const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? ''

export function isObservabilityConfigured(): boolean {
  return Boolean(SENTRY_DSN)
}

/**
 * Log an exception. Falls back to console.error in all environments today.
 * When @sentry/nextjs is added to deps, swap this to call its captureException.
 */
export async function captureException(err: unknown, ctx?: CaptureContext): Promise<void> {
  console.error('[obs] exception:', err, ctx ?? {})
  // No-op return so call sites can await.
  return Promise.resolve()
}

export function captureBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!SENTRY_DSN) return
  console.info(`[obs] ${category} ${message}`, data ?? {})
}
