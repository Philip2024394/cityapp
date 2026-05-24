'use client'
import { useState } from 'react'
import { Drawer } from 'vaul'
import { Menu, X } from 'lucide-react'
import { CATEGORIES, GROUPS, categoryMeta } from '@/lib/places/categories'
import type { PlaceCategory, PlaceGroup } from '@/lib/places/types'

// Unified filter — three shapes the list reduces over:
//   'all'                                       no filter
//   { kind: 'group',    group:    PlaceGroup }  matches every category in the group
//   { kind: 'category', category: PlaceCategory } single category match
export type PlaceFilter =
  | 'all'
  | { kind: 'group';    group: PlaceGroup }
  | { kind: 'category'; category: PlaceCategory }

// Three quick filters shown as toggles. Tourist is a *group* shortcut
// (covers temple + beach + attraction in one tap); Restaurants is a
// *category* (just `restaurant`). Everything else lives in the drawer.
const QUICK_FILTERS: Array<{ id: string; label: string; labelEn: string; filter: PlaceFilter }> = [
  { id: 'all',        label: 'Semua',  labelEn: 'All',         filter: 'all' },
  { id: 'tourist',    label: 'Wisata', labelEn: 'Tourist',     filter: { kind: 'group',    group: 'tourist' } },
  { id: 'restaurant', label: 'Resto',  labelEn: 'Restaurants', filter: { kind: 'category', category: 'restaurant' } },
]

// Drawer = every category except 'restaurant' (already a quick filter).
// Ordered by group so visually related rows cluster together in the list.
const DRAWER_CATEGORIES: PlaceCategory[] = (
  ['tourist', 'eat_drink', 'health', 'stay_shop', 'transit', 'services'] as PlaceGroup[]
).flatMap((g) =>
  GROUPS.find((gg) => gg.id === g)!.categories.filter((c) => c !== 'restaurant'),
)

function filtersEqual(a: PlaceFilter, b: PlaceFilter): boolean {
  if (a === 'all' && b === 'all') return true
  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (a.kind === 'group'    && b.kind === 'group')    return a.group === b.group
  if (a.kind === 'category' && b.kind === 'category') return a.category === b.category
  return false
}

export default function CategoryChips({
  value,
  onChange,
}: {
  value: PlaceFilter
  onChange: (next: PlaceFilter) => void
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // "Drawer filter is active" = a single category is selected that
  // doesn't have its own quick toggle. Drives the active chip rendered
  // below the toggle row so the user always sees the current filter.
  const drawerCategory =
    typeof value === 'object' && value.kind === 'category' && value.category !== 'restaurant'
      ? value.category
      : null
  const drawerMeta = drawerCategory ? categoryMeta(drawerCategory) : null

  return (
    <div>
      <div
        className="flex items-stretch gap-1 border-b border-white/10"
        role="tablist"
        aria-label="Filter places"
      >
        {QUICK_FILTERS.map((qf) => {
          const active = filtersEqual(value, qf.filter)
          return (
            <button
              key={qf.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(qf.filter)}
              className="relative flex-1 px-1 py-2.5 text-center transition"
              style={{ minHeight: 44 }}
            >
              <span
                className={`block text-[14px] font-extrabold uppercase tracking-wider transition ${
                  active ? 'text-brand' : 'text-muted'
                }`}
              >
                {qf.label}
              </span>
              <span
                aria-hidden
                className={`absolute left-1/2 -translate-x-1/2 -bottom-[1px] h-[3px] rounded-full bg-gradient-to-r from-brand to-brand2 shadow-[0_0_10px_rgba(250,204,21,0.45)] transition-all ${
                  active ? 'w-12 opacity-100' : 'w-0 opacity-0'
                }`}
              />
            </button>
          )
        })}

        <Drawer.Root direction="right" open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Drawer.Trigger asChild>
            <button
              type="button"
              aria-label="All categories"
              // Blur the trigger as soon as it's tapped — vaul applies
              // aria-hidden="true" to <main> when the drawer opens, and
              // if THIS button still has focus inside main, the browser
              // logs the "Blocked aria-hidden on an element because its
              // descendant retained focus" WAI-ARIA warning. Blurring
              // here moves focus off the button before vaul's state
              // update fires, so by the time aria-hidden lands, nothing
              // inside main is focused. Vaul's own focus trap then
              // takes over inside Drawer.Content.
              onClick={(e) => (e.currentTarget as HTMLButtonElement).blur()}
              className="shrink-0 ml-1 mb-1 w-11 h-11 self-center rounded-xl flex items-center justify-center text-bg bg-gradient-to-br from-brand to-brand2 shadow-[0_4px_14px_rgba(250,204,21,0.30)] active:scale-95 transition"
            >
              <Menu className="w-5 h-5" strokeWidth={2.75} />
            </button>
          </Drawer.Trigger>

          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm" />
            <Drawer.Content
              className="fixed right-0 top-0 bottom-0 z-[61] w-[300px] max-w-[85vw] outline-none"
              aria-describedby={undefined}
            >
              <div className="relative h-full bg-bg border-l border-brand/40 flex flex-col pt-safe pb-safe">
                {/* Yellow "running light" — a bright dot slides vertically
                    down the drawer's left edge so the panel feels alive. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{
                    background:
                      'linear-gradient(180deg, transparent 0%, #FACC15 40%, #FFFFFF 50%, #FACC15 60%, transparent 100%)',
                    backgroundSize: '100% 200%',
                    animation: 'runningLight 2.6s linear infinite',
                    boxShadow: '0 0 12px rgba(250,204,21,0.65)',
                  }}
                />
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                  <Drawer.Title className="text-[16px] font-extrabold text-ink">
                    Semua kategori
                  </Drawer.Title>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close categories"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-white/5 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {(() => {
                    const allActive = value === 'all'
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          onChange('all')
                          setDrawerOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99] ${
                          allActive ? 'ring-2 ring-white/50' : ''
                        }`}
                        style={{ minHeight: 44 }}
                      >
                        <span
                          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-black/85"
                          aria-hidden
                        >
                          <Menu className="w-4 h-4 text-white" strokeWidth={2.75} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-extrabold leading-tight text-bg">
                            Semua
                          </span>
                          <span className="block text-[12px] font-bold leading-tight text-bg/75">
                            All places
                          </span>
                        </span>
                      </button>
                    )
                  })()}

                  {DRAWER_CATEGORIES.map((cat) => {
                    const meta = CATEGORIES[cat]
                    const Icon = meta.Icon
                    const filter: PlaceFilter = { kind: 'category', category: cat }
                    const active = filtersEqual(value, filter)
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          onChange(filter)
                          setDrawerOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99] ${
                          active ? 'ring-2 ring-white/50' : ''
                        }`}
                        style={{ minHeight: 44 }}
                      >
                        <span
                          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-black/85"
                          aria-hidden
                        >
                          <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-extrabold leading-tight text-bg">
                            {meta.label}
                          </span>
                          <span className="block text-[12px] font-bold leading-tight text-bg/75">
                            {meta.labelEn}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      {/* Active drawer-filter chip — shows the chosen category name with
          a quick "clear" so the user always knows what's filtering the
          list when none of the visible toggles are highlighted. */}
      {drawerMeta && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[12px] text-muted font-bold">Showing:</span>
          <button
            type="button"
            onClick={() => onChange('all')}
            aria-label={`Clear ${drawerMeta.labelEn} filter`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/15 border border-brand/35 text-brand text-[12px] font-extrabold"
            style={{ minHeight: 28 }}
          >
            <span>{drawerMeta.label}</span>
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  )
}
