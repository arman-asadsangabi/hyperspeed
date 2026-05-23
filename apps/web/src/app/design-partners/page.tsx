import { ApplicationForm } from './application-form'

export const dynamic = 'force-static'

export default function DesignPartnersPage() {
  return (
    <main className="min-h-screen bg-[var(--color-primary-pale)]">
      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wider text-[var(--color-primary-deep)]">
          Design partners
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
          Co-create a specialist memory pack
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--color-slate-soft)]">
          Hyperspeed&apos;s design partner program builds a custom, verified expertise pack
          alongside your team — typically a $25–50K engagement that takes 4–8 weeks. You get first
          access; we use the learnings to harden the platform.
        </p>
        <div className="mt-10 rounded-xl border border-[var(--color-border-base)] bg-white p-8 shadow-sm">
          <ApplicationForm />
        </div>
      </section>
    </main>
  )
}
