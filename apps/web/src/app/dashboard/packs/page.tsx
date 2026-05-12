import Link from 'next/link'
import { listMyPacks, listCategories } from '@/lib/packs/actions'
import { hasRoleAtLeast, requireOrgContext } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ archived?: string; categoryId?: string; q?: string }>
}

export default async function PacksPage({ searchParams }: PageProps) {
  const ctx = await requireOrgContext()
  const params = await searchParams
  const canCreate = await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')

  const [packs, cats] = await Promise.all([
    listMyPacks({
      archived: params.archived === 'true' ? true : params.archived === 'false' ? false : undefined,
      categoryId: params.categoryId,
      q: params.q,
    }),
    listCategories(),
  ])

  const activeCategory = params.categoryId
  const showArchived = params.archived === 'true'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">Packs</h1>
          <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
            Memory packs your organization owns or is co-creating.
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/dashboard/packs/new"
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-primary-deep)]"
          >
            New pack
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <form className="flex flex-1 items-center gap-2" action="">
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search packs by name"
            className="w-full max-w-xs rounded-md border border-[var(--color-border-base)] bg-white px-3 py-1.5 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
          {activeCategory ? <input type="hidden" name="categoryId" value={activeCategory} /> : null}
          {showArchived ? <input type="hidden" name="archived" value="true" /> : null}
        </form>
        <Link
          href={{
            pathname: '/dashboard/packs',
            query: { ...(activeCategory ? { categoryId: activeCategory } : {}) },
          }}
          className={`rounded-md border px-3 py-1.5 ${
            !showArchived
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-pale)] text-[var(--color-primary-deep)]'
              : 'border-[var(--color-border-base)] bg-white text-[var(--color-slate-soft)]'
          }`}
        >
          Active
        </Link>
        <Link
          href={{
            pathname: '/dashboard/packs',
            query: { archived: 'true', ...(activeCategory ? { categoryId: activeCategory } : {}) },
          }}
          className={`rounded-md border px-3 py-1.5 ${
            showArchived
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-pale)] text-[var(--color-primary-deep)]'
              : 'border-[var(--color-border-base)] bg-white text-[var(--color-slate-soft)]'
          }`}
        >
          Archived
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href={{
            pathname: '/dashboard/packs',
            query: { ...(showArchived ? { archived: 'true' } : {}) },
          }}
          className={`rounded-full px-3 py-1 ${
            !activeCategory
              ? 'bg-[var(--color-ink)] text-white'
              : 'border border-[var(--color-border-base)] bg-white text-[var(--color-slate-soft)] hover:bg-[var(--color-primary-pale)]'
          }`}
        >
          All
        </Link>
        {cats.map((c) => (
          <Link
            key={c.id}
            href={{
              pathname: '/dashboard/packs',
              query: { categoryId: c.id, ...(showArchived ? { archived: 'true' } : {}) },
            }}
            className={`rounded-full px-3 py-1 ${
              activeCategory === c.id
                ? 'bg-[var(--color-ink)] text-white'
                : 'border border-[var(--color-border-base)] bg-white text-[var(--color-slate-soft)] hover:bg-[var(--color-primary-pale)]'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {packs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border-base)] bg-white p-12 text-center">
          <p className="text-sm text-[var(--color-slate-soft)]">
            {showArchived ? 'No archived packs.' : 'No packs yet.'}
          </p>
          {canCreate && !showArchived ? (
            <Link
              href="/dashboard/packs/new"
              className="mt-4 inline-block rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-primary-deep)]"
            >
              Create your first pack
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map(({ pack, category }) => (
            <Link
              key={pack.id}
              href={`/dashboard/packs/${pack.id}`}
              className="rounded-lg border border-[var(--color-border-base)] bg-white p-5 transition hover:border-[var(--color-primary)] hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-[var(--color-ink)]">{pack.name}</h2>
                {pack.isArchived ? (
                  <span className="rounded-full bg-[var(--color-primary-pale)] px-2 py-0.5 text-xs text-[var(--color-slate-soft)]">
                    archived
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-xs text-[var(--color-slate-soft)]">/{pack.slug}</p>
              {pack.description ? (
                <p className="mt-3 line-clamp-2 text-sm text-[var(--color-slate-soft)]">
                  {pack.description}
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-slate-soft)]">
                <span>{category?.name ?? 'Uncategorized'}</span>
                <span>Updated {new Date(pack.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
