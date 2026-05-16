'use client'

import { useState, useTransition } from 'react'
import { chatAgainstVersion } from '@/lib/packs/test_chat'
import { MarkdownView } from '@/components/markdown-view'

interface Entry {
  id: string
  entryType: string
  title: string
}

interface Turn {
  role: 'user' | 'assistant'
  content: string
  cited?: string[]
}

export function TestChat({ versionId, entries }: { versionId: string; entries: Entry[] }) {
  const [history, setHistory] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [pending, startTransition] = useTransition()

  function send() {
    if (!input.trim()) return
    const msg = input
    setInput('')
    setHistory((h) => [...h, { role: 'user', content: msg }])
    startTransition(async () => {
      try {
        const result = await chatAgainstVersion(
          versionId,
          history.map((t) => ({ role: t.role, content: t.content })),
          msg,
        )
        setHistory((h) => [
          ...h,
          { role: 'assistant', content: result.reply, cited: result.citedEntryIds },
        ])
      } catch (e) {
        setHistory((h) => [
          ...h,
          { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'unknown'}` },
        ])
      }
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="rounded-xl border border-[var(--color-border-base)] bg-white p-6 shadow-sm">
        <div className="min-h-[400px] space-y-4">
          {history.length === 0 ? (
            <p className="text-sm text-[var(--color-slate-soft)]">
              Ask a question to start. Try something a real user would ask in this domain.
            </p>
          ) : null}
          {history.map((t, i) => (
            <div key={i}>
              <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
                {t.role === 'user' ? 'You' : 'Pack-grounded Claude'}
              </div>
              {t.role === 'assistant' ? (
                <MarkdownView className="mt-1 text-sm text-[var(--color-ink)]">
                  {t.content}
                </MarkdownView>
              ) : (
                <div className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-ink)]">
                  {t.content}
                </div>
              )}
              {t.cited && t.cited.length > 0 ? (
                <div className="mt-2 text-xs text-[var(--color-slate-soft)]">
                  Cited:{' '}
                  {t.cited
                    .slice(0, 5)
                    .map((id) => entries.find((e) => e.id === id)?.title ?? id.slice(0, 6))
                    .join(' · ')}
                </div>
              ) : null}
            </div>
          ))}
          {pending ? <p className="text-xs text-[var(--color-slate-soft)]">Thinking…</p> : null}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Ask anything within this pack's domain..."
            className="flex-1 rounded-md border border-[var(--color-border-base)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
          <button
            type="button"
            onClick={send}
            disabled={pending || !input.trim()}
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-primary-deep)] disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </div>
      <aside className="hidden lg:block">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
          Pack entries ({entries.length})
        </h3>
        <ul className="mt-2 space-y-1 text-xs">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-md border border-[var(--color-border-base)] bg-white p-2"
            >
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-slate-soft)]">
                {e.entryType.replace(/_/g, ' ')}
              </div>
              <div className="text-[var(--color-ink)]">{e.title}</div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
