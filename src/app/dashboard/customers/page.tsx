'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Search, Users } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import CustomerRow from '@/components/rider/CustomerRow'
import { MOCK_CUSTOMERS, repeatCustomers, thisWeek, totalLeadsValue, type Customer } from '@/data/mockCustomers'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { reengageLink, quickPingLink } from '@/lib/whatsapp/reengage'
import { useHaptic } from '@/hooks/useHaptic'
import { idr } from '@/lib/format/idr'

const ME = MOCK_RIDERS[0]!

type FilterMode = 'all' | 'repeat' | 'thisWeek'

export default function CustomerBookPage() {
  const haptic = useHaptic()
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list: Customer[] = MOCK_CUSTOMERS
    if (filter === 'repeat')   list = repeatCustomers()
    if (filter === 'thisWeek') list = thisWeek(MOCK_CUSTOMERS)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.displayName ?? '').toLowerCase().includes(q) ||
        c.whatsappE164.includes(q.replace(/[^0-9]/g, '')) ||
        c.lastRoute.toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => b.lastContactAt - a.lastContactAt)
  }, [filter, search])

  const totalRevenue = totalLeadsValue(MOCK_CUSTOMERS)
  const totalTrips   = MOCK_CUSTOMERS.reduce((s, c) => s + c.totalTrips, 0)
  const repeatPct    = Math.round((repeatCustomers().length / MOCK_CUSTOMERS.length) * 100)

  function onPesanUlang(c: Customer) {
    haptic.impact()
    window.open(reengageLink(c, ME.name), '_blank', 'noopener,noreferrer')
  }
  function onQuickPing(c: Customer) {
    haptic.tap()
    window.open(quickPingLink(c, ME.name), '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-32">
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
              All customers who have booked via City Rider. Message them again anytime — you own the data.
            </p>
          </header>

          {/* Top-line stats */}
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Total customers" value={MOCK_CUSTOMERS.length.toString()} />
            <StatTile label="Total trips" value={totalTrips.toString()} />
            <StatTile label="Repeat" value={`${repeatPct}%`} accent />
          </div>

          <div className="card p-3.5 flex items-center justify-between gap-3">
            <div className="text-[13px] text-muted">Total value of all trips</div>
            <div className="text-[16px] font-extrabold gradient-text">{idr(totalRevenue)}</div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              className="input pl-11"
              placeholder="Search name, WhatsApp, or route…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            <FilterChip active={filter === 'all'}      onClick={() => { setFilter('all'); haptic.tap() }}      label={`All · ${MOCK_CUSTOMERS.length}`} />
            <FilterChip active={filter === 'repeat'}   onClick={() => { setFilter('repeat'); haptic.tap() }}   label={`Repeat · ${repeatCustomers().length}`} />
            <FilterChip active={filter === 'thisWeek'} onClick={() => { setFilter('thisWeek'); haptic.tap() }} label={`7 days · ${thisWeek(MOCK_CUSTOMERS).length}`} />
          </div>

          {/* List */}
          <div className="space-y-2.5">
            {filtered.length === 0 ? (
              <div className="card p-8 text-center text-muted text-[14px]">
                No matching customers.
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
        </div>
      </main>
      <DashboardNav />
    </>
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
