'use client'
import { useMemo, useState } from 'react'
import { ArrowUpDown } from 'lucide-react'

// ============================================================================
// SortableDriversTable
// ----------------------------------------------------------------------------
// Tiny client component that powers the "Top drivers by engagement" table.
// Server renders the rows; this component just toggles sort order without
// any round-trip. Columns: business_name, vehicle_type, city, profile_views,
// wa_clicks, contact_pings.
//
// 13px text floor, 44px min header tap targets — brand yellow accent
// on active sort column.
// ============================================================================

export type DriverRow = {
  user_id: string
  business_name: string
  slug: string
  vehicle_type: string
  city: string | null
  profile_views_30d: number
  unique_visitors_30d: number
  wa_clicks_30d: number
  contact_pings_30d: number
  /** 0..1 fraction. Format with (×100).toFixed(1)%. */
  ctr_30d: number
}

type SortKey = 'business_name' | 'vehicle_type' | 'city' | 'profile_views_30d' | 'unique_visitors_30d' | 'wa_clicks_30d' | 'contact_pings_30d' | 'ctr_30d'
type SortDir = 'asc' | 'desc'

export default function SortableDriversTable({ rows }: { rows: DriverRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('profile_views_30d')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => {
    const out = [...rows]
    out.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return out
  }, [rows, sortKey, sortDir])

  function setSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(typeof rows[0]?.[key] === 'number' ? 'desc' : 'asc')
    }
  }

  if (!rows.length) {
    return <div className="text-[13px] text-muted py-3">No driver engagement in the last 30 days.</div>
  }

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <table className="w-full text-[13px] min-w-[640px]">
        <thead>
          <tr className="text-[12px] uppercase tracking-wider text-dim font-extrabold">
            <Th label="Business" k="business_name" active={sortKey} dir={sortDir} onSort={setSort} />
            <Th label="Vehicle"  k="vehicle_type"  active={sortKey} dir={sortDir} onSort={setSort} />
            <Th label="City"     k="city"          active={sortKey} dir={sortDir} onSort={setSort} />
            <Th label="Views"    k="profile_views_30d"   active={sortKey} dir={sortDir} onSort={setSort} align="right" />
            <Th label="Uniq."    k="unique_visitors_30d" active={sortKey} dir={sortDir} onSort={setSort} align="right" />
            <Th label="WA"       k="wa_clicks_30d"       active={sortKey} dir={sortDir} onSort={setSort} align="right" />
            <Th label="CTR"      k="ctr_30d"             active={sortKey} dir={sortDir} onSort={setSort} align="right" />
            <Th label="Pings"    k="contact_pings_30d"   active={sortKey} dir={sortDir} onSort={setSort} align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.user_id} className="border-t border-line/40">
              <td className="py-2.5 pr-3 align-middle">
                <a
                  href={`/cari/${r.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="font-bold hover:text-brand transition truncate block max-w-[200px]"
                  title={r.business_name}
                >
                  {r.business_name || '(no name)'}
                </a>
                <div className="text-[11px] text-dim font-mono truncate max-w-[200px]">{r.slug}</div>
              </td>
              <td className="py-2.5 pr-3 align-middle capitalize text-muted">{r.vehicle_type.replace('_', ' ')}</td>
              <td className="py-2.5 pr-3 align-middle text-muted truncate max-w-[120px]">{r.city || '—'}</td>
              <td className="py-2.5 pr-3 align-middle text-right font-extrabold tabular-nums">{r.profile_views_30d}</td>
              <td className="py-2.5 pr-3 align-middle text-right font-extrabold tabular-nums">{r.unique_visitors_30d}</td>
              <td className="py-2.5 pr-3 align-middle text-right font-extrabold tabular-nums">{r.wa_clicks_30d}</td>
              <td className="py-2.5 pr-3 align-middle text-right font-extrabold tabular-nums">{(r.ctr_30d * 100).toFixed(1)}%</td>
              <td className="py-2.5 pr-3 align-middle text-right font-extrabold tabular-nums">{r.contact_pings_30d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  label, k, active, dir, onSort, align,
}: {
  label: string
  k: SortKey
  active: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  align?: 'right'
}) {
  const isActive = active === k
  return (
    <th
      scope="col"
      className={`py-2 pr-3 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 min-h-[44px] py-1 ${align === 'right' ? 'flex-row-reverse' : ''} ${isActive ? 'text-brand' : 'hover:text-ink transition'}`}
      >
        {label}
        <ArrowUpDown className="w-3 h-3 opacity-60" />
        {isActive && <span className="text-[10px] font-extrabold">{dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  )
}
