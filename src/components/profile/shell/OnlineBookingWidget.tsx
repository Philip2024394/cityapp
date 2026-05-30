'use client'
import { useMemo } from 'react'
import {
  Plus, X as XIcon, MessageCircle, ArrowUp, ArrowDown, Bookmark, Star,
  UserRound, Package as PackageIcon,
} from 'lucide-react'
import PlaceAutocomplete from '@/components/inputs/PlaceAutocomplete'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useCountryFromCoords } from '@/hooks/useCountryFromCoords'
import { idr } from '@/lib/format/idr'
import { fireConnectIntent } from '@/lib/connectIntent'
import BookingTextField from './BookingTextField'
import type { DriverPublic } from '../DriverProfileShell'

const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'
const TEXT_MUTED   = '#71717A'
const TEXT_SECOND  = '#52525B'
const BORDER       = '#E4E4E7'
const INPUT_BG     = '#F4F4F5'

export default function OnlineBookingWidget({
  driver, pickup, setPickup, dropoff, setDropoff, stops, setStops,
  estimate, waLink, mode, setMode, offersRide, offersParcel, onBookingSent,
}: {
  driver:        DriverPublic
  pickup:        string;  setPickup:  (v: string) => void
  dropoff:       string;  setDropoff: (v: string) => void
  stops:         string[]; setStops:  (v: string[]) => void
  estimate:      { minFee: number; pricePerKm: number; pitstopFee: number; numStops: number } | null
  waLink:        string
  mode:          'ride' | 'parcel'
  setMode:       (m: 'ride' | 'parcel') => void
  offersRide:    boolean
  offersParcel:  boolean
  /** Fires the instant BOOK NOW is tapped (before the WA deep-link
   *  opens), so the hero route-preview polyline starts its 6s colour
   *  transition from black → brand yellow. */
  onBookingSent: () => void
}) {
  const canBook = pickup.trim().length > 0 && dropoff.trim().length > 0 && waLink.length > 0

  // Geolocation bias for the autosuggest dropdown — matches /cari's
  // pattern. Country filter narrows results to the user's actual market.
  const geo = useGeolocation(true)
  const userCountry = useCountryFromCoords(geo.coords ?? null)
  const countryCodes = useMemo(() => (userCountry ? [userCountry] : []), [userCountry])

  const handleSwap = () => {
    const prevPickup  = pickup
    const prevDropoff = dropoff
    setPickup(prevDropoff)
    setDropoff(prevPickup)
  }

  return (
    <section
      className="mt-4 rounded-2xl p-3 space-y-2.5"
      style={{ background: '#FFFFFF', border: `1px solid ${BORDER}` }}
    >
      {offersRide && offersParcel && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('ride')}
            aria-pressed={mode === 'ride'}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-extrabold text-[13px] tracking-tight transition active:scale-95"
            style={{
              background: mode === 'ride' ? BRAND_YELLOW : INPUT_BG,
              color:      mode === 'ride' ? TEXT_INK     : TEXT_SECOND,
              border:     `1px solid ${mode === 'ride' ? BRAND_YELLOW : BORDER}`,
              boxShadow:  mode === 'ride' ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
              minHeight: 44,
            }}
          >
            <UserRound className="w-4 h-4" strokeWidth={2.5} />
            <span>Book a ride</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('parcel')}
            aria-pressed={mode === 'parcel'}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-extrabold text-[13px] tracking-tight transition active:scale-95"
            style={{
              background: mode === 'parcel' ? BRAND_YELLOW : INPUT_BG,
              color:      mode === 'parcel' ? TEXT_INK     : TEXT_SECOND,
              border:     `1px solid ${mode === 'parcel' ? BRAND_YELLOW : BORDER}`,
              boxShadow:  mode === 'parcel' ? '0 4px 12px rgba(250,204,21,0.35)' : 'none',
              minHeight: 44,
            }}
          >
            <PackageIcon className="w-4 h-4" strokeWidth={2.5} />
            <span>Send a parcel</span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_INK }}>
          {mode === 'parcel' ? `Send via ${driver.business_name.split(' ')[0]}` : `Book ${driver.business_name.split(' ')[0]}`}
        </h2>
        <button
          type="button"
          onClick={() => setStops([...stops, ''])}
          aria-label="Add stop"
          className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full font-extrabold text-[12px] active:scale-95 transition"
          style={{
            background: BRAND_YELLOW,
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

      {/* Pickup + Dropoff row — 3 columns: left connector (ring + dotted
          line + filled circle), inputs, right swap-arrows button. */}
      <div className="flex items-stretch gap-2">
        <div
          className="flex flex-col items-center justify-between py-2.5 shrink-0"
          style={{ width: 16 }}
          aria-hidden
        >
          <div
            className="w-3 h-3 rounded-full border-2"
            style={{ borderColor: TEXT_INK, background: 'transparent' }}
          />
          <div
            className="flex-1 my-1"
            style={{
              width: 2,
              backgroundImage: 'repeating-linear-gradient(to bottom, #0A0A0A 0 3px, transparent 3px 6px)',
            }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: BRAND_YELLOW, boxShadow: `0 0 0 2px ${TEXT_INK} inset` }}
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>
              Pickup
            </label>
            <div className="relative">
              <PlaceAutocomplete
                value={pickup}
                onChange={setPickup}
                onSelect={(s) => setPickup(s.label)}
                placeholder="Where do you want to be picked up?"
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#0A0A0A] placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                near={geo.coords ?? null}
                countryCodes={countryCodes}
                ariaLabel="Pick up location"
                clearOnFocus
                dropdownDirection="down"
                maxResults={3}
                rightSlot={
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center"
                    aria-hidden
                  >
                    <Bookmark className="w-[18px] h-[18px] text-[#FACC15]" strokeWidth={2.4} fill="#FACC15" />
                  </span>
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>
              Drop off
            </label>
            <div className="relative">
              <PlaceAutocomplete
                value={dropoff}
                onChange={setDropoff}
                onSelect={(s) => setDropoff(s.label)}
                placeholder="Where do you want to go?"
                className="w-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#0A0A0A] placeholder:text-[#71717A] rounded-xl pl-3 pr-11 py-2.5 text-[14px] font-bold focus:outline-none focus:bg-white focus:border-[#FACC15] transition"
                near={geo.coords ?? null}
                countryCodes={countryCodes}
                ariaLabel="Drop off location"
                clearOnFocus
                dropdownDirection="down"
                maxResults={3}
                rightSlot={
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center"
                    aria-hidden
                  >
                    <Star className="w-[18px] h-[18px] text-[#FACC15]" strokeWidth={2.4} fill="#FACC15" />
                  </span>
                }
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSwap}
          aria-label="Swap pickup and dropoff"
          className="shrink-0 self-center flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 active:scale-95 transition"
          style={{
            background: INPUT_BG,
            border: `1px solid ${BORDER}`,
            minWidth: 44,
            minHeight: 44,
            color: TEXT_INK,
          }}
        >
          <ArrowUp className="w-3.5 h-3.5" strokeWidth={3} />
          <ArrowDown className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      </div>

      {/* Multi-stop list — each stop has its own input + remove button.
          No cap per spec. */}
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

      {/* Estimate line — driver's own rate. We DO NOT fabricate a km
          count here because pickup/dropoff are typed addresses (not
          geocoded). Compliance copy: "Estimate · driver's own rate". */}
      {estimate ? (
        <div
          className="rounded-xl p-2.5 flex items-baseline justify-between gap-2"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: '#854D0E' }}>
              Estimate · {driver.business_name.split(' ')[0]}&apos;s own rate
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: TEXT_SECOND }}>
              From {idr(estimate.minFee)} · driver&apos;s rate {idr(estimate.pricePerKm)}/km
              {estimate.numStops > 0 && estimate.pitstopFee > 0 && (
                <> · + {idr(estimate.pitstopFee)} per stop</>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[11px] italic" style={{ color: TEXT_MUTED }}>
          Driver hasn&apos;t published a rate yet — confirm price in chat.
        </div>
      )}

      {/* BOOK NOW — opens WhatsApp with the pre-filled message. Also
          flips the hero route-preview polyline into its 6s black →
          yellow colour transition. The WA deep-link is NOT delayed —
          the state flip fires synchronously before the browser handles
          the anchor navigation. */}
      <a
        href={canBook ? waLink : undefined}
        target={canBook ? '_blank' : undefined}
        rel="noopener noreferrer"
        aria-disabled={!canBook}
        onClick={(e) => {
          if (!canBook) { e.preventDefault(); return }
          const isBike   = driver.vehicle_type === 'bike'
          const source   = isBike ? 'rider_profile' : 'car_profile'
          const vertical = isBike ? 'rider' : 'car'
          fireConnectIntent(driver.id, source, vertical)
          onBookingSent()
        }}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-extrabold text-[14px] uppercase tracking-wider active:scale-[0.99] transition"
        style={{
          minHeight: 48,
          background: canBook ? BRAND_YELLOW : INPUT_BG,
          color: canBook ? TEXT_INK : TEXT_MUTED,
          border: `1px solid ${canBook ? BRAND_YELLOW : BORDER}`,
          boxShadow: canBook ? '0 8px 18px rgba(250,204,21,0.35)' : 'none',
          opacity: canBook ? 1 : 0.85,
          cursor: canBook ? 'pointer' : 'not-allowed',
        }}
      >
        <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
        Book now
      </a>
      <p className="text-[11px] text-center leading-snug" style={{ color: TEXT_MUTED }}>
        Opens WhatsApp with your trip details. You can edit before sending.
      </p>
    </section>
  )
}
