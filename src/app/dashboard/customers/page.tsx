'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Search, Users, Share2, Loader2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import CustomerRow from '@/components/rider/CustomerRow'
import { MOCK_CUSTOMERS, repeatCustomers, thisWeek, totalLeadsValue, type Customer } from '@/data/mockCustomers'
import { fetchMyDriverBrowser } from '@/lib/drivers/queries'
import { reengageLink, quickPingLink } from '@/lib/whatsapp/reengage'
import { useHaptic } from '@/hooks/useHaptic'
import { idr } from '@/lib/format/idr'
import type { Rider } from '@/types/rider'

// Demo data is loaded ONLY in non-production builds so designers/QA can
// see the populated state. Production gets the real empty state until
// the `customers` table is shipped + wired.
const IS_DEV = process.env.NODE_ENV !== 'production'

type FilterMode = 'all' | 'repeat' | 'thisWeek'

export default function CustomerBookPage() {
  const haptic = useHaptic()
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')
  const [ME, setME] = useState<Rider | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchMyDriverBrowser().then((me) => {
      if (cancelled) return
      setME(me)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  // Real customer book is not yet shipped — return [] in production.
  // Demo build keeps the mock pool so designers can iterate on the layout.
  const SOURCE: Customer[] = IS_DEV ? MOCK_CUSTOMERS : []

  const filtered = useMemo(() => {
    let list: Customer[] = SOURCE
    if (filter === 'repeat')   list = SOURCE.filter(c => c.totalTrips >= 2)
    if (filter === 'thisWeek') list = thisWeek(SOURCE)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.displayName ?? '').toLowerCase().includes(q) ||
        c.whatsappE164.includes(q.replace(/[^0-9]/g, '')) ||
        c.lastRoute.toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => b.lastContactAt - a.lastContactAt)
  }, [filter, search, SOURCE])

  const hasData = SOURCE.length > 0
  const totalRevenue = totalLeadsValue(SOURCE)
  const totalTrips   = SOURCE.reduce((s, c) => s + c.totalTrips, 0)
  const repeatPct    = hasData
    ? Math.round((SOURCE.filter(c => c.totalTrips >= 2).length / SOURCE.length) * 100)
    : 0

  function onPesanUlang(c: Customer) {
    if (!ME) return
    haptic.impact()
    window.open(reengageLink(c, ME.name), '_blank', 'noopener,noreferrer')
  }
  function onQuickPing(c: Customer) {
    if (!ME) return
    haptic.tap()
    window.open(quickPingLink(c, ME.name), '_blank', 'noopener,noreferrer')
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
                <Users className="w-4 h-4 text-brand" />
              </div>
              <h1 className="text-2xl font-extrabold">Customer Book</h1>
            </div>
            <p className="text-muted text-[14px]">
              Semua customer yang booking via Kita2u. Pesan mereka kapan saja — data kamu sendiri.
            </p>
          </header>

          {!loaded ? (
            <div className="card p-8 flex items-center justify-center text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : !hasData ? (
            <CustomerBookEmptyState slug={ME?.slug ?? null} />
          ) : (
            <>
              {/* Top-line stats */}
              <div className="grid grid-cols-3 gap-2">
                <StatTile label="Total customers" value={SOURCE.length.toString()} />
                <StatTile label="Total trips" value={totalTrips.toString()} />
                <StatTile label="Repeat" value={`${repeatPct}%`} accent />
              </div>

              <div className="card p-3.5 flex items-center justify-between gap-3">
                <div className="text-[13px] text-muted">Total nilai semua trip</div>
                <div className="text-[16px] font-extrabold gradient-text">{idr(totalRevenue)}</div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  className="input pl-11"
                  placeholder="Cari nama, WhatsApp, atau rute…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                <FilterChip active={filter === 'all'}      onClick={() => { setFilter('all'); haptic.tap() }}      label={`Semua · ${SOURCE.length}`} />
                <FilterChip active={filter === 'repeat'}   onClick={() => { setFilter('repeat'); haptic.tap() }}   label={`Repeat · ${repeatCustomers().length}`} />
                <FilterChip active={filter === 'thisWeek'} onClick={() => { setFilter('thisWeek'); haptic.tap() }} label={`7 hari · ${thisWeek(SOURCE).length}`} />
              </div>

              {/* List */}
              <div className="space-y-2.5">
                {filtered.length === 0 ? (
                  <div className="card p-8 text-center text-muted text-[14px]">
                    Tidak ada customer yang cocok.
                  </div>
                ) : filtered.map(c => (
                  <CustomerRow
                    key={c.id}
                    customer={c}
                    onPesanUlang={() => onPesanUlang(c)}
                    onQuickPing={() => onQuickPing(c)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}

function CustomerBookEmptyState({ slug }: { slug: string | null }) {
  return (
    <div className="card p-6 text-center space-y-3">
      <div
        className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.30)' }}
      >
        <Users className="w-5 h-5 text-brand" />
      </div>
      <div>
        <div className="font-extrabold text-[16px]">Customer Book masih kosong</div>
        <p className="text-[14px] text-muted leading-relaxed mt-1.5 max-w-sm mx-auto">
          Setiap customer yang booking via Kita2u akan otomatis masuk ke sini.
          Mulai dari share link profilmu — semakin banyak yang lihat, semakin cepat
          Customer Book ini terisi.
        </p>
      </div>
      {slug && (
        <Link
          href="/dashboard/card"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-2xl bg-gradient-to-r from-brand to-brand2 text-bg font-extrabold text-[14px] uppercase tracking-wider border border-black/85 active:scale-[0.99]"
          style={{ minHeight: 48 }}
        >
          <Share2 className="w-4 h-4" />
          Bagikan link profilmu
        </Link>
      )}
    </div>
  )
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-3">
      <div className={'text-[18px] font-extrabold leading-none ' + (accent ? 'gradient-text' : 'text-ink')}>{value}</div>
      <div className="text-[13px] text-dim mt-1.5">{label}</div>
    </div>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
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
