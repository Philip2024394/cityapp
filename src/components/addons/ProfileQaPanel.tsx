'use client'

// ============================================================================
// <ProfileQaPanel /> — public profile Q&A panel.
//
// Renders only when the provider has the 'qa' addon enabled AND has at
// least one Q&A item. Drop into any profile shell (beautician, handyman,
// places, etc.) by passing the provider's owner_user_id.
//
// We deliberately fetch client-side to keep this widget cheap to render
// — the rest of the profile page can stay statically cached at the CDN
// while only the Q&A items hit the API.
// ============================================================================

import { useEffect, useState } from 'react'
import { ChevronDown, MessageCircleQuestion } from 'lucide-react'

type Item = { id: string; question: string; answer: string }

export default function ProfileQaPanel({ ownerUserId }: { ownerUserId: string | null }) {
  const [items, setItems] = useState<Item[]>([])
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ownerUserId) { setLoading(false); return }
    let cancelled = false
    fetch(`/api/addons/qa?owner=${encodeURIComponent(ownerUserId)}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { items?: Item[] } | null) => {
        if (cancelled || !j) return
        setItems(j.items ?? [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [ownerUserId])

  if (loading)         return null
  if (items.length === 0) return null

  return (
    <section className="rounded-2xl border border-[#E4E4E7] bg-white p-4 sm:p-5 mt-4">
      <h2 className="flex items-center gap-2 text-[14px] font-black tracking-tight mb-3">
        <MessageCircleQuestion className="w-4 h-4" strokeWidth={2.5} aria-hidden />
        Pertanyaan yang sering ditanya
      </h2>
      <ul className="divide-y divide-[#F1F1F1]">
        {items.map((it) => {
          const isOpen = openIds.has(it.id)
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => {
                  const next = new Set(openIds)
                  if (isOpen) next.delete(it.id); else next.add(it.id)
                  setOpenIds(next)
                }}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 py-3 text-left active:opacity-80 transition min-h-[48px]"
              >
                <span className="font-extrabold text-[13.5px] text-[#0A0A0A] leading-tight">
                  {it.question}
                </span>
                <ChevronDown
                  className={`shrink-0 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  strokeWidth={2.5}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <p className="text-[13px] text-[#52525B] leading-relaxed pb-3 whitespace-pre-line">
                  {it.answer}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
