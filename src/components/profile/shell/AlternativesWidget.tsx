'use client'
import { useMemo } from 'react'
import Link from 'next/link'
import { Plus, X as XIcon } from 'lucide-react'
import { haversineKm } from '@/lib/geo/haversine'
import BookingTextField from './BookingTextField'
import AlternativeRow from './AlternativeRow'
import type { DriverPublic } from '../DriverProfileShell'

const TEXT_INK    = '#0A0A0A'
const TEXT_MUTED  = '#71717A'
const BORDER      = '#E4E4E7'

// Shown when the page driver is BUSY or OFFLINE. Surfaces 3–5 online
// drivers with the SAME vehicle_type, sorted nearest-first when the
// parent driver has lat/lng (anchor-based proximity since we don't have
// the customer's coords). Falls back to alphabetical otherwise.
export default function AlternativesWidget({
  driver, availability, alternatives,
  pickup, setPickup, dropoff, setDropoff, stops, setStops,
}: {
  driver:        DriverPublic
  availability:  'busy' | 'offline'
  alternatives:  DriverPublic[]
  pickup:        string;  setPickup:  (v: string) => void
  dropoff:       string;  setDropoff: (v: string) => void
  stops:         string[]; setStops:  (v: string[]) => void
}) {
  const ranked = useMemo(() => {
    const anchorLat = driver.lat
    const anchorLng = driver.lng
    const hasAnchor = typeof anchorLat === 'number' && typeof anchorLng === 'number'
                       && (anchorLat !== 0 || anchorLng !== 0)
    const list = alternatives.slice()
    if (hasAnchor) {
      list.sort((a, b) => {
        const aHas = typeof a.lat === 'number' && typeof a.lng === 'number' && (a.lat !== 0 || a.lng !== 0)
        const bHas = typeof b.lat === 'number' && typeof b.lng === 'number' && (b.lat !== 0 || b.lng !== 0)
        if (aHas && bHas) {
          const da = haversineKm({ lat: anchorLat!, lng: anchorLng! }, { lat: a.lat!, lng: a.lng! })
          const db = haversineKm({ lat: anchorLat!, lng: anchorLng! }, { lat: b.lat!, lng: b.lng! })
          return da - db
        }
        if (aHas) return -1
        if (bHas) return 1
        return a.business_name.localeCompare(b.business_name)
      })
    } else {
      list.sort((a, b) => a.business_name.localeCompare(b.business_name))
    }
    return list.slice(0, 5)
  }, [alternatives, driver.lat, driver.lng])

  return (
    <section
      className="mt-4 rounded-2xl p-3 space-y-3"
      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
    >
      {/* Header row — section title left, small yellow Add-stop pill right.
          Matches the OnlineBookingWidget header so the busy/offline branch
          carries the same control surface as the online branch. */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_INK }}>
          Try these instead
        </h2>
        <button
          type="button"
          onClick={() => setStops([...stops, ''])}
          aria-label="Add stop"
          className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full font-extrabold text-[12px] active:scale-95 transition"
          style={{
            background: '#FACC15',
            color: TEXT_INK,
            boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
            minHeight: 32,
          }}
        >
          <span
            className="w-4 h-4 rounded-full inline-flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.10)' }}
          >
            <Plus className="w-3 h-3" strokeWidth={3} />
          </span>
          <span>Add stop</span>
        </button>
      </div>

      {/* Same input set as the online widget — customer can still type
          where they want to go, then tap a Book → on an alternative. */}
      <BookingTextField label="Pickup"   value={pickup}  onChange={setPickup}  placeholder="Where do you want to be picked up?" />
      <BookingTextField label="Drop off" value={dropoff} onChange={setDropoff} placeholder="Where do you want to go?" />
      {stops.map((s, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <BookingTextField
              label={`Stop ${i + 1}`}
              value={s}
              onChange={(v) => {
                const next = stops.slice()
                next[i] = v
                setStops(next)
              }}
              placeholder="Stop address or note"
            />
          </div>
          <button
            type="button"
            onClick={() => setStops(stops.filter((_, j) => j !== i))}
            aria-label={`Remove stop ${i + 1}`}
            className="shrink-0 rounded-lg flex items-center justify-center active:scale-95 transition"
            style={{
              minWidth: 44, minHeight: 44,
              background: '#FEE2E2', border: '1px solid #FCA5A5',
              color: '#B91C1C',
            }}
          >
            <XIcon className="w-4 h-4" strokeWidth={2.75} />
          </button>
        </div>
      ))}

      {ranked.length > 0 ? (
        <ul className="space-y-2 pt-1">
          {ranked.map((alt) => (
            <AlternativeRow
              key={alt.id}
              alt={alt}
              anchorLat={driver.lat}
              anchorLng={driver.lng}
            />
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-center py-3" style={{ color: TEXT_MUTED }}>
          No other drivers online right now.{' '}
          <Link href="/cari" className="font-extrabold underline" style={{ color: TEXT_INK }}>
            Browse the directory
          </Link>
        </p>
      )}
    </section>
  )
}
