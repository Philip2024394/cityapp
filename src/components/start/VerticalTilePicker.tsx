'use client'
// ============================================================================
// VerticalTilePicker — step 1 of /start. A 4-col (sm+) / 2-col (mobile) grid
// of business-type tiles. Visitors tap a tile → wizard advances to step 2 with
// the picked vertical stored in state. Tiles flagged `comingSoon` render with
// a Lock icon + disabled affordance.
// ----------------------------------------------------------------------------
// Iconography parity: matches LIFESTYLE_TILES in src/app/explore/ExploreClient
// so a user coming from the marketplace sees the same icon for the same
// vertical here, avoiding a "wait, is this the right thing?" hesitation.
// ============================================================================
import { Lock, type LucideIcon } from 'lucide-react'
import type { VerticalEntry } from '@/app/start/verticals'

export default function VerticalTilePicker({
  verticals,
  selected,
  onSelect,
}: {
  verticals: ReadonlyArray<VerticalEntry>
  selected: string | null
  onSelect: (slug: string) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {verticals.map((v) => (
        <Tile
          key={v.slug}
          slug={v.slug}
          label={v.label}
          Icon={v.icon}
          comingSoon={v.comingSoon}
          selected={selected === v.slug}
          onClick={() => !v.comingSoon && onSelect(v.slug)}
        />
      ))}
    </div>
  )
}

function Tile({
  slug, label, Icon, comingSoon, selected, onClick,
}: {
  slug: string
  label: string
  Icon: LucideIcon
  comingSoon: boolean
  selected: boolean
  onClick: () => void
}) {
  // Selected → yellow border + gold tint + shadow.
  // Coming soon → muted, Lock badge in top-right, not selectable.
  // Default → white card, hover gold border.
  const baseCls =
    'relative rounded-2xl border p-3.5 flex flex-col items-start gap-2 transition active:scale-[0.98] text-left min-h-[88px]'
  const stateCls = comingSoon
    ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
    : selected
      ? 'bg-[#FFFBEA] border-[#FACC15] shadow-[0_6px_16px_rgba(250,204,21,0.25)]'
      : 'bg-white border-gray-100 hover:border-[#FACC15]'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={comingSoon}
      aria-pressed={selected}
      data-slug={slug}
      className={`${baseCls} ${stateCls}`}
      style={!comingSoon && !selected ? { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' } : undefined}
    >
      {comingSoon && (
        <span
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center"
          aria-label="Coming soon"
        >
          <Lock className="w-3 h-3 text-gray-500" strokeWidth={2.5} />
        </span>
      )}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: selected
            ? '#FACC15'
            : comingSoon
              ? '#F4F4F5'
              : 'rgba(250,204,21,0.18)',
          border: comingSoon ? '1px solid #E4E4E7' : '1px solid rgba(250,204,21,0.45)',
        }}
      >
        <Icon
          className="w-4 h-4"
          strokeWidth={2.25}
          style={{ color: selected ? '#0A0A0A' : comingSoon ? '#A1A1AA' : '#0A0A0A' }}
        />
      </div>
      <div className="font-extrabold text-[13px] text-[#0A0A0A] leading-tight">
        {label}
      </div>
      {comingSoon && (
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Coming soon
        </div>
      )}
    </button>
  )
}
