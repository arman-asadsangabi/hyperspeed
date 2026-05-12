import { listIncomingLicenses } from '@/lib/licenses/actions'

export const dynamic = 'force-dynamic'

export default async function CatalogPage() {
  const licenses = await listIncomingLicenses()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Pack catalog
        </h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Packs your organization has licensed. Use the IDs below in API queries.
        </p>
      </div>

      {licenses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border-base)] bg-white p-10 text-center text-sm text-[var(--color-slate-soft)]">
          No licenses yet. Contact{' '}
          <a
            className="text-[var(--color-primary)] underline"
            href="mailto:hyperspeedsolutions@gmail.com"
          >
            hyperspeedsolutions@gmail.com
          </a>{' '}
          to license packs.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {licenses.map(({ license, pack, licensorName }) => (
            <article
              key={license.id}
              className="rounded-lg border border-[var(--color-border-base)] bg-white p-5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-full bg-[var(--color-primary-pale)] px-2 py-0.5 text-[var(--color-primary-deep)]">
                  {license.status}
                </span>
                <span className="text-[var(--color-slate-soft)]">{license.slaTier}</span>
              </div>
              <h2 className="mt-2 text-base font-semibold text-[var(--color-ink)]">{pack.name}</h2>
              <p className="mt-1 text-xs text-[var(--color-slate-soft)]">by {licensorName}</p>
              <p className="mt-3 break-all font-mono text-[10px] text-[var(--color-slate-soft)]">
                {pack.id}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-1 text-xs">
                <dt className="text-[var(--color-slate-soft)]">Type</dt>
                <dd className="text-[var(--color-ink)]">{license.licenseType}</dd>
                {license.monthlyQueryLimit ? (
                  <>
                    <dt className="text-[var(--color-slate-soft)]">Monthly limit</dt>
                    <dd className="text-[var(--color-ink)]">
                      {license.monthlyQueryLimit.toLocaleString()}
                    </dd>
                  </>
                ) : null}
                {license.endsAt ? (
                  <>
                    <dt className="text-[var(--color-slate-soft)]">Expires</dt>
                    <dd className="text-[var(--color-ink)]">
                      {new Date(license.endsAt).toLocaleDateString()}
                    </dd>
                  </>
                ) : null}
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
