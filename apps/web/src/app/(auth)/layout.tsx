import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--color-primary-pale)]">
      <header className="border-b border-[var(--color-border-base)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[var(--color-primary)]" aria-hidden />
            <span className="font-semibold tracking-tight text-[var(--color-ink)]">Hyperspeed</span>
          </Link>
        </div>
      </header>
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  )
}
