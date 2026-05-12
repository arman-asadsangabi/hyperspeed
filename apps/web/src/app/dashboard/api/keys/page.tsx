import { hasRoleAtLeast, requireOrgContext } from '@/lib/auth/session'
import { listApiKeys } from '@/lib/api_keys/actions'
import { KeysManager } from './keys-manager'

export const dynamic = 'force-dynamic'

export default async function ApiKeysPage() {
  const ctx = await requireOrgContext()
  const [keys, canManage] = await Promise.all([
    listApiKeys(),
    hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">API keys</h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Each key is shown ONCE on creation. Store it in a secret manager — it can&apos;t be
          recovered.
        </p>
      </div>
      <KeysManager
        initialKeys={keys.map((k) => ({
          id: k.id,
          name: k.name,
          tier: k.tier,
          keyPrefix: k.keyPrefix,
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        }))}
        canManage={canManage}
      />
    </div>
  )
}
