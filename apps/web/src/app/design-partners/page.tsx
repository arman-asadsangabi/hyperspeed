import { ApplicationForm } from './application-form'

export const dynamic = 'force-static'

export default function DesignPartnersPage() {
  return (
    <main className="min-h-screen bg-[var(--color-primary-pale)]">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wider text-[var(--color-primary-deep)]">
          Faculty partners
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
          Publish your course as an expertise pack
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--color-slate-soft)]">
          Hyperspeed&apos;s faculty partner program helps professors turn lecture notes, slide
          decks, and reading lists into a structured, citable pack their students license for use
          inside any LLM. Free for the first cohort; we use the learnings to harden the platform and
          you get first-class authoring support, eval scaffolding, and a published catalog listing.
        </p>
        <div className="mt-10 rounded-xl border border-[var(--color-border-base)] bg-white p-8 shadow-sm">
          <ApplicationForm />
        </div>
      </section>
    </main>
  )
}
