'use client'
import { GROUPS, type GroupMeta } from '@/lib/places/categories'
import type { PlaceGroup } from '@/lib/places/types'

export type GroupFilter = PlaceGroup | 'all'

// Horizontal scrolling chip rail. "Semua" (All) is the first chip,
// then one chip per group. Mobile-first: chips scroll horizontally
// with momentum; on sm+ they wrap into a single row.
//
// 44 px minimum tap height per chip (WCAG). Active chip is solid
// yellow with black text; inactive chips are dark glass with muted text.
export default function CategoryChips({
  value,
  onChange,
}: {
  value: GroupFilter
  onChange: (next: GroupFilter) => void
}) {
  return (
    <div
      className="
        -mx-4 px-4
        overflow-x-auto
        scrollbar-none
      "
      role="tablist"
      aria-label="Filter places by category"
    >
      <div className="inline-flex items-center gap-2 pb-1">
        <Chip
          active={value === 'all'}
          onClick={() => onChange('all')}
          label="Semua"
          labelEn="All"
        />
        {GROUPS.map((g) => (
          <Chip
            key={g.id}
            active={value === g.id}
            onClick={() => onChange(g.id)}
            label={g.label}
            labelEn={g.labelEn}
            group={g}
          />
        ))}
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  label,
  labelEn,
  group,
}: {
  active: boolean
  onClick: () => void
  label: string
  labelEn: string
  group?: GroupMeta
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`
        shrink-0
        inline-flex items-center gap-1.5
        px-3.5 rounded-full
        text-[13px] font-extrabold
        whitespace-nowrap
        transition-all
        ${active
          ? 'bg-gradient-to-r from-brand to-brand2 text-bg shadow-[0_4px_14px_rgba(250,204,21,0.30)]'
          : 'bg-black/55 text-muted border border-white/10 hover:border-brand/35 hover:text-ink'}
      `}
      style={{ minHeight: 44 }}
      aria-label={`${labelEn} — ${label}`}
    >
      <span>{label}</span>
      {group && (
        <span className={`text-[11px] font-bold opacity-70 ${active ? 'text-bg/75' : 'text-dim'}`}>
          · {labelEn}
        </span>
      )}
    </button>
  )
}
