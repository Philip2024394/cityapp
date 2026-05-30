'use client'
import { languagesByIds } from '@/lib/languages'

const TEXT_MUTED  = '#71717A'
const TEXT_SECOND = '#52525B'

// Hidden when driver speaks only Indonesian — every Indonesian driver speaks
// Bahasa, so the default-only state carries no extra signal for tourists.
export default function LanguageFlagsRow({ languages }: { languages: string[] | null }) {
  if (!languages || languages.length === 0) return null
  const beyondIndonesian = languages.filter((l) => l !== 'id')
  if (beyondIndonesian.length === 0) return null
  const ordered = ['id', ...beyondIndonesian]
  const defs = languagesByIds(ordered).slice(0, 3)
  if (defs.length === 0) return null
  return (
    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
      {defs.map((l, i) => (
        <span key={l.id} className="inline-flex items-center gap-1 leading-none">
          {i > 0 && <span className="text-[10px]" style={{ color: TEXT_MUTED }}>·</span>}
          <span aria-hidden style={{ fontSize: 18 }}>{l.flag}</span>
          <span
            className="text-[11px] font-extrabold uppercase tracking-wider"
            style={{ color: TEXT_SECOND }}
          >
            {l.id}
          </span>
        </span>
      ))}
    </div>
  )
}
