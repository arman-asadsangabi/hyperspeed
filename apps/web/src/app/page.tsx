import Link from 'next/link'
import { BRAND } from '@hyperspeed/shared/brand'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-[var(--color-border-base)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-[var(--color-primary)]" aria-hidden />
            <span className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              {BRAND.name}
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-[var(--color-slate-soft)]">
            <Link href="/docs" className="hover:text-[var(--color-ink)]">
              Docs
            </Link>
            <Link href="/sign-in" className="hover:text-[var(--color-ink)]">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-[var(--color-primary)] px-3.5 py-1.5 text-white shadow-sm transition hover:bg-[var(--color-primary-deep)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-[var(--color-primary-deep)]">
            B2B for AI companies
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-tight tracking-tight text-[var(--color-ink)] md:text-6xl">
            {BRAND.tagline}.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--color-slate-soft)]">
            Verified domain experts package their knowledge into structured memory packs. AI
            companies license those packs via API to inject specialist context into their agents at
            runtime.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/design-partners"
              className="rounded-md bg-[var(--color-primary)] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-primary-deep)]"
            >
              Apply as design partner
            </Link>
            <Link
              href="/docs"
              className="rounded-md border border-[var(--color-border-base)] bg-white px-5 py-3 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-primary-pale)]"
            >
              Read the docs
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Verified expertise',
              body: 'Every pack is authored by a credentialed domain expert and gated on automated eval scores.',
            },
            {
              title: 'Runtime API',
              body: 'Sub-200ms p95 query latency. Inject specialist context into your agents without ballooning context windows.',
            },
            {
              title: 'Audit-grade',
              body: 'Versioned packs, full citation chains, per-call provenance. Built for regulated industries.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-[var(--color-border-base)] bg-white p-6"
            >
              <h3 className="text-base font-semibold text-[var(--color-ink)]">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-slate-soft)]">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--color-border-base)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-[var(--color-slate-soft)]">
          <span>
            &copy; {new Date().getFullYear()} {BRAND.name}
          </span>
          <span>Pre-launch &middot; design partners only</span>
        </div>
      </footer>
    </main>
  )
}
