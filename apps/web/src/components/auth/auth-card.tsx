import Link from 'next/link'

interface AuthCardProps {
  title: string
  subtitle: string
  footer: { text: string; linkText: string; linkHref: string }
  children: React.ReactNode
}

export function AuthCard({ title, subtitle, footer, children }: AuthCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border-base)] bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">{title}</h1>
        <p className="mt-1.5 text-sm text-[var(--color-slate-soft)]">{subtitle}</p>
      </div>
      {children}
      <p className="mt-6 text-center text-sm text-[var(--color-slate-soft)]">
        {footer.text}{' '}
        <Link
          href={footer.linkHref}
          className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-deep)]"
        >
          {footer.linkText}
        </Link>
      </p>
    </div>
  )
}
