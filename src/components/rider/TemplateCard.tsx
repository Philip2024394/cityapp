'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { Template } from '@/data/replyTemplates'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/data/replyTemplates'

type Props = {
  template: Template
  onCopy: () => void
}

export default function TemplateCard({ template, onCopy }: Props) {
  const [copied, setCopied] = useState(false)
  const color = CATEGORY_COLORS[template.category]

  async function copy() {
    try {
      await navigator.clipboard.writeText(template.text)
      setCopied(true)
      onCopy()
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — could fall back to a textarea + select-all */
    }
  }

  return (
    <article className="card card-driver p-4 animate-[fadeUp_0.4s_ease-out_both]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[13px] font-extrabold leading-tight"
            style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
          >
            {CATEGORY_LABELS[template.category]}
          </span>
          <span className="font-extrabold text-[15px] truncate">{template.label}</span>
        </div>
        <button
          onClick={copy}
          className="shrink-0 px-3 py-1.5 rounded-full border text-[13px] font-extrabold flex items-center gap-1.5 transition min-h-[36px]"
          style={{
            background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(250,204,21,0.10)',
            color: copied ? '#22C55E' : '#FACC15',
            borderColor: copied ? 'rgba(34,197,94,0.35)' : 'rgba(250,204,21,0.32)',
          }}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-[14px] leading-relaxed text-ink/85 whitespace-pre-line">
        {template.text}
      </p>
    </article>
  )
}
