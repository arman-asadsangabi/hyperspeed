import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata = {
  title: 'Pricing — Hyperspeed',
  description: '$5/month for unlimited student access to professor-authored knowledge packs.',
}

const STUDENT_FEATURES = [
  'Unlimited queries against any pack you license',
  'Works in ChatGPT, Claude Desktop, Cursor, and any MCP-aware tool',
  'Direct API + SDK access (TypeScript / cURL)',
  'Citations to the exact lecture or chapter the answer came from',
  'Cancel anytime',
]

const FACULTY_FEATURES = [
  'Author and publish your own packs',
  'AI-assisted ingestion from lecture notes, slides, syllabi',
  'Eval-gated publishing to catch regressions between semesters',
  'Catalog listing + revenue share when students license your packs',
  'First cohort: free, in exchange for product feedback',
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-[var(--color-border-base)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-[var(--color-primary)]" aria-hidden />
            <span className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Hyperspeed
            </span>
          </Link>
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

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--color-primary-deep)]">
            Pricing
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--color-ink)] md:text-5xl">
            Simple, student-friendly pricing
          </h1>
          <p className="mt-4 text-lg text-[var(--color-slate-soft)]">
            One flat monthly fee for full access. Pay for your professor&apos;s expertise, not
            tokens.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-primary)] bg-white p-8 shadow-md ring-1 ring-[var(--color-primary)]">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">Student</h2>
              <span className="rounded-full bg-[var(--color-primary-pale)] px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-[var(--color-primary-deep)]">
                Most popular
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-slate-soft)]">
              Plug your professor&apos;s pack into any LLM.
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-semibold tracking-tight text-[var(--color-ink)]">
                $5
              </span>
              <span className="text-base text-[var(--color-slate-soft)]">/month</span>
            </div>
            <Link
              href="/sign-up?next=/dashboard/billing"
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-primary-deep)]"
            >
              Start subscription
            </Link>
            <ul className="mt-6 space-y-2 text-sm text-[var(--color-ink)]">
              {STUDENT_FEATURES.map((f) => (
                <li key={f} className="flex gap-2">
                  <span aria-hidden className="text-[var(--color-primary)]">
                    ✓
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--color-border-base)] bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--color-ink)]">Faculty</h2>
            <p className="mt-2 text-sm text-[var(--color-slate-soft)]">
              Author and publish packs your students can license.
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-semibold tracking-tight text-[var(--color-ink)]">
                Free
              </span>
              <span className="text-base text-[var(--color-slate-soft)]">first cohort</span>
            </div>
            <Link
              href="/design-partners"
              className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-[var(--color-border-base)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-primary-pale)]"
            >
              Apply as faculty partner
            </Link>
            <ul className="mt-6 space-y-2 text-sm text-[var(--color-ink)]">
              {FACULTY_FEATURES.map((f) => (
                <li key={f} className="flex gap-2">
                  <span aria-hidden className="text-[var(--color-primary)]">
                    ✓
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-[var(--color-slate-soft)]">
          Institutional / departmental licensing available — contact us at{' '}
          <a href="mailto:hello@hyperspeed.work" className="underline">
            hello@hyperspeed.work
          </a>
          .
        </p>
      </section>
    </main>
  )
}
