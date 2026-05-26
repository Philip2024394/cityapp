'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, MessageSquare, Check } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import TemplateCard from '@/components/rider/TemplateCard'
import { REPLY_TEMPLATES, CATEGORY_LABELS, type Template } from '@/data/replyTemplates'
import { useHaptic } from '@/hooks/useHaptic'

type Category = 'all' | Template['category']

export default function TemplatesPage() {
  const haptic = useHaptic()
  const [category, setCategory] = useState<Category>('all')
  const [lastCopied, setLastCopied] = useState<string | null>(null)

  const filtered = useMemo(() =>
    category === 'all' ? REPLY_TEMPLATES : REPLY_TEMPLATES.filter(t => t.category === category),
    [category],
  )

  function onCopied(t: Template) {
    haptic.tap()
    setLastCopied(t.id)
    setTimeout(() => setLastCopied(null), 2000)
  }

  return (
    <>
      <AppNav />
      <main className="min-h-[100dvh] pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
          <Link href="/dashboard" className="text-[13px] text-muted hover:text-ink font-bold flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>

          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-brand/12 border border-brand/25 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-brand" />
              </div>
              <h1 className="text-2xl font-extrabold">Quick replies</h1>
            </div>
            <p className="text-muted text-[14px]">
              Professional templates for replying to customers on WhatsApp. Tap <strong className="text-brand">Copy</strong>, then paste in chat.
            </p>
          </header>

          {/* Last-copied toast (inline) */}
          {lastCopied && (
            <div className="card p-3 flex items-center gap-2 border-online/30 bg-online/5 animate-[fadeUp_0.3s_ease-out_both]">
              <Check className="w-4 h-4 text-online" />
              <span className="text-[13px] text-online font-bold">Copied — paste in the customer's WhatsApp</span>
            </div>
          )}

          {/* Category filter */}
          <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            <Chip active={category === 'all'} onClick={() => { setCategory('all'); haptic.tap() }} label="All" />
            {(Object.keys(CATEGORY_LABELS) as Template['category'][]).map(c => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => { setCategory(c); haptic.tap() }}
                label={CATEGORY_LABELS[c]}
              />
            ))}
          </div>

          <div className="space-y-2.5">
            {filtered.map(t => (
              <TemplateCard key={t.id} template={t} onCopy={() => onCopied(t)} />
            ))}
          </div>

          {/* Coaching footer */}
          <div className="card p-4 border-brand/20 bg-brand/5">
            <div className="text-[13px] text-ink/85 leading-relaxed">
              💡 <strong className="text-brand">Tip:</strong> don't send templates as-is. Add 1-2 personal words (customer's name, place name) so it feels warm, not robotic.
            </div>
          </div>
        </div>
      </main>
      <DashboardNav />
    </>
  )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition border whitespace-nowrap min-h-[36px]"
      style={{
        background: active ? '#FACC15' : 'rgba(255,255,255,0.04)',
        color: active ? '#0A0A0A' : 'rgba(255,255,255,0.75)',
        borderColor: active ? '#FACC15' : 'rgba(255,255,255,0.1)',
      }}
    >
      {label}
    </button>
  )
}
