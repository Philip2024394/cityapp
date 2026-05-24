'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Drawer } from 'vaul'
import { Search, X, Building2, Check, Bike, Plus } from 'lucide-react'
import { useHaptic } from '@/hooks/useHaptic'
import RentalCard from './RentalCard'
import type { BikeRental, RentalMode } from '@/lib/rentals/types'

// Indonesian cities the drawer offers — only yogyakarta + denpasar have
// seeded data today. The rest are listed so users can see the roadmap;
// selecting them routes to /rent?city=<slug> which the server handles
// (returns empty list → empty-state message).
const SUPPORTED_CITIES = [
  { slug: 'yogyakarta', label: 'Yogyakarta' },
  { slug: 'denpasar',   label: 'Bali (Denpasar)' },
  { slug: 'jakarta',    label: 'Jakarta' },
  { slug: 'bandung',    label: 'Bandung' },
  { slug: 'surabaya',   label: 'Surabaya' },
  { slug: 'medan',      label: 'Medan' },
  { slug: 'semarang',   label: 'Semarang' },
  { slug: 'makassar',   label: 'Makassar' },
  { slug: 'malang',     label: 'Malang' },
  { slug: 'solo',       label: 'Solo' },
] as const

const MODES: Array<{ id: 'all' | RentalMode; label: string }> = [
  { id: 'all',         label: 'All' },
  { id: 'self_ride',   label: 'Bike Only' },
  { id: 'with_driver', label: '+ Driver' },
]

function cityLabel(slug: string): string {
  return SUPPORTED_CITIES.find((c) => c.slug === slug)?.label ?? slug
}

export default function RentalList({
  rentals,
  currentCity,
}: {
  rentals: BikeRental[]
  currentCity: string
}) {
  const router = useRouter()
  const haptic = useHaptic()

  const [mode, setMode]               = useState<'all' | RentalMode>('all')
  const [query, setQuery]             = useState('')
  const [cityPickerOpen, setCityPickerOpen] = useState(false)

  // Client-side filter pipeline: mode → free-text query. Search matches
  // brand, model, year, owner name, company, color, tags.
  const filtered = useMemo(() => {
    let base = rentals
    if (mode !== 'all') {
      base = base.filter((r) =>
        mode === 'with_driver'
          ? r.rentalMode === 'with_driver' || r.rentalMode === 'both'
          : r.rentalMode === 'self_ride'   || r.rentalMode === 'both',
      )
    }
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter((r) =>
      r.brand.toLowerCase().includes(q) ||
      r.model.toLowerCase().includes(q) ||
      String(r.year).includes(q) ||
      r.ownerName.toLowerCase().includes(q) ||
      (r.ownerCompany ?? '').toLowerCase().includes(q) ||
      (r.color ?? '').toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [rentals, mode, query])

  function selectCity(slug: string) {
    haptic.tap()
    setCityPickerOpen(false)
    if (slug === currentCity) return
    router.push(`/rent?city=${slug}`)
  }

  return (
    <div className="space-y-3">
      {/* Search + yellow city button row — mirrors /places hero. */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari motor — Honda, NMAX, 2023, Vario…"
            aria-label="Search motorcycle rentals"
            className="w-full bg-black/55 border border-white/10 focus:border-brand/45 text-ink placeholder:text-muted rounded-2xl pl-10 pr-10 py-3 text-[14px] font-bold focus:outline-none transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-white/5 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => { haptic.tap(); setCityPickerOpen(true) }}
          aria-label={`Change city (currently ${cityLabel(currentCity)})`}
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-bg bg-gradient-to-br from-brand to-brand2 shadow-[0_4px_14px_rgba(250,204,21,0.30)] active:scale-95 transition"
        >
          <Building2 className="w-5 h-5" strokeWidth={2.75} />
        </button>
      </div>

      {/* Mode toggle — All / Bike Only / Plus Driver, yellow underline. */}
      <div
        className="flex items-stretch gap-1 border-b border-white/10"
        role="tablist"
        aria-label="Filter rentals by mode"
      >
        {MODES.map((m) => {
          const active = m.id === mode
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setMode(m.id); haptic.tap() }}
              className="relative flex-1 px-1 py-2.5 text-center transition"
              style={{ minHeight: 44 }}
            >
              <span
                className={`block text-[14px] font-extrabold uppercase tracking-wider transition ${
                  active ? 'text-brand' : 'text-muted'
                }`}
              >
                {m.label}
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
      </div>

      {/* City header above first card. */}
      <div className="flex items-center gap-2 pt-1">
        <Bike className="w-4 h-4 text-brand" strokeWidth={2.5} aria-hidden />
        <span className="text-[14px] font-extrabold uppercase tracking-wider text-ink">
          {cityLabel(currentCity)} · Rental
        </span>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card-dark p-6 text-center">
            <p className="text-[14px] text-muted">
              {query.trim()
                ? `Tidak ada motor untuk "${query.trim()}". Coba kata kunci lain.`
                : `Belum ada motor untuk ${cityLabel(currentCity)}. Jadilah owner pertama dengan tap "List Bike" di atas.`}
            </p>
          </div>
        )}
        {filtered.map((r) => <RentalCard key={r.id} rental={r} />)}
      </div>

      {/* City picker drawer — same yellow-gradient design as /places. */}
      <Drawer.Root direction="right" open={cityPickerOpen} onOpenChange={setCityPickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm" />
          <Drawer.Content
            className="fixed right-0 top-0 bottom-0 z-[61] w-[300px] max-w-[85vw] outline-none"
            aria-describedby={undefined}
          >
            <div className="relative h-full bg-bg border-l border-brand/40 flex flex-col pt-safe pb-safe">
              {/* Yellow running-light strip on the left edge. */}
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
                  Pilih kota
                </Drawer.Title>
                <button
                  type="button"
                  onClick={() => setCityPickerOpen(false)}
                  aria-label="Close city picker"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-white/5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {/* Pinned "List your bike" CTA — first row, matches the
                    /places drawer's "List your place" pattern. */}
                <button
                  type="button"
                  onClick={() => {
                    haptic.tap()
                    setCityPickerOpen(false)
                    router.push('/rent/list')
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99]"
                  style={{ minHeight: 44 }}
                >
                  <span
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-black/85"
                    aria-hidden
                  >
                    <Plus className="w-4 h-4 text-white" strokeWidth={3} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-extrabold leading-tight text-bg">
                      List your bike
                    </span>
                    <span className="block text-[12px] font-bold leading-tight text-bg/75">
                      GRATIS 7 hari · Rp 38K/bulan
                    </span>
                  </span>
                </button>

                <div className="pt-2 pb-1 px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
                    Pilih kota
                  </span>
                </div>

                {SUPPORTED_CITIES.map((c) => {
                  const active = c.slug === currentCity
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => selectCity(c.slug)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-[0.99] ${
                        active ? 'ring-2 ring-white/50' : ''
                      }`}
                      style={{ minHeight: 44 }}
                    >
                      <span
                        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-black/85"
                        aria-hidden
                      >
                        <Building2 className="w-4 h-4 text-white" strokeWidth={2.75} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-extrabold leading-tight text-bg">
                          {c.label}
                        </span>
                      </span>
                      {active && <Check className="w-4 h-4 text-bg shrink-0" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}
