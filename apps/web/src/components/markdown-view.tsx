'use client'

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 mt-4 text-lg font-semibold tracking-tight text-[var(--color-ink)] first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-base font-semibold tracking-tight text-[var(--color-ink)] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-semibold tracking-tight text-[var(--color-ink)] first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1.5 mt-3 text-sm font-semibold text-[var(--color-ink)] first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-2 text-sm leading-relaxed text-[var(--color-ink)] first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 ml-5 list-disc space-y-1 text-sm text-[var(--color-ink)]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-5 list-decimal space-y-1 text-sm text-[var(--color-ink)]">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--color-ink)]">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--color-border-base)] pl-3 text-sm italic text-[var(--color-slate-soft)]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-[var(--color-border-base)]" />,
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className ?? '')
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-md bg-[var(--color-primary-pale)] p-3 font-mono text-xs text-[var(--color-ink)]">
          {children}
        </code>
      )
    }
    return (
      <code className="rounded bg-[var(--color-primary-pale)] px-1 py-0.5 font-mono text-[0.85em] text-[var(--color-ink)]">
        {children}
      </code>
    )
  },
  pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-md border border-[var(--color-border-base)]">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--color-primary-pale)] text-left">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-1.5 text-xs font-medium text-[var(--color-slate-soft)]">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-[var(--color-border-base)] px-3 py-1.5 text-[var(--color-ink)]">
      {children}
    </td>
  ),
}

export function MarkdownView({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
