// =============================================================================
// buildBookingMessage — single canonical WhatsApp deep-link builder for every
// CityRiders booking surface (/cari sticky CTA, /r/[slug] + /car/[slug]
// profile widgets, anything else that opens a wa.me with a ride/parcel
// prefill). Before this consolidation, three separate inline implementations
// drifted — /cari and the profile shell used PICKUP/DROP OFF copy with the
// ━ divider, while the older lib/whatsapp/buildLink.ts builder used the
// JEMPUT/ANTAR Indonesian copy. Keeping ONE source of truth here prevents
// future format drift, and the discriminated options object covers every
// field shape the prior three callers needed:
//   - /cari: optional pre-computed trip km, optional one pit-stop note.
//   - profile widget: multi-stop list, optional estimate breakdown.
// Output uses the newer divider-based format because that's what live
// customers + drivers see today on /cari and the profile widgets.
// =============================================================================

import { idr } from '@/lib/format/idr'
import { normaliseE164ForWaMe } from '@/lib/whatsapp/buildLink'

export type BookingMessageOptions = {
  driver: {
    business_name: string
    whatsapp_e164: string | null
  }
  mode: 'ride' | 'parcel'
  pickup?:  { label: string; coord?: { lat: number; lng: number } | null }
  dropoff?: { label: string; coord?: { lat: number; lng: number } | null }
  /** Multi-stop free-text rows (no coords). Used by the profile widget. */
  stops?: string[]
  /** Optional pitstop note + fee. Used by /cari. */
  pitstop?: { note: string; fee?: number } | null
  /** Optional estimate breakdown line. Used by the profile widget. */
  estimate?: {
    minFee:     number
    pricePerKm: number
    pitstopFee: number
    numStops:   number
  } | null
  /** Optional pre-computed trip distance in km. Used by /cari for the
   *  "Jarak: X km" line. */
  tripKm?: number | null
  /** Optional ETA in minutes. Reserved for future use. */
  etaMin?: number | null
}

const DIVIDER = '━━━━━━━━━━━━━━━━━━'

function gmapsPin(c: { lat: number; lng: number }): string {
  return `https://www.google.com/maps?q=${c.lat.toFixed(6)},${c.lng.toFixed(6)}`
}

function gmapsDirections(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
): string {
  return `https://www.google.com/maps/dir/?api=1` +
    `&origin=${from.lat.toFixed(6)},${from.lng.toFixed(6)}` +
    `&destination=${to.lat.toFixed(6)},${to.lng.toFixed(6)}` +
    `&travelmode=driving`
}

/**
 * Builds a fully-formatted Indonesian booking message ready to encode into
 * a wa.me URL. Returns '' when the driver's WhatsApp number is unusable —
 * caller must check before opening the link.
 */
export function buildBookingMessage(opts: BookingMessageOptions): string {
  const name = opts.driver.business_name
  const opener = opts.mode === 'parcel'
    ? `Halo *${name}*, saya mau kirim paket via CityRiders.`
    : `Halo *${name}*, saya mau pesan ride via CityRiders.`

  const lines: string[] = [opener, '', DIVIDER, '']

  const pickupLabel  = opts.pickup?.label?.trim()  ?? ''
  const dropoffLabel = opts.dropoff?.label?.trim() ?? ''
  const pickupCoord  = opts.pickup?.coord  ?? null
  const dropoffCoord = opts.dropoff?.coord ?? null

  // PICKUP block — emit when EITHER a label OR a coord is present.
  // Free-typed labels render without a pin link rather than fabricating one.
  if (pickupLabel || pickupCoord) {
    lines.push('📍 *PICKUP*')
    lines.push(pickupLabel || 'Lokasi saya')
    if (pickupCoord) lines.push(gmapsPin(pickupCoord))
    lines.push('')
  }

  if (dropoffLabel || dropoffCoord) {
    lines.push('🏁 *DROP OFF*')
    lines.push(dropoffLabel || 'Lokasi tujuan')
    if (dropoffCoord) lines.push(gmapsPin(dropoffCoord))
    lines.push('')
  }

  // Turn-by-turn directions — only when BOTH ends have coords. One tap
  // opens Google Maps with the route plotted, ready for "Start".
  if (pickupCoord && dropoffCoord) {
    lines.push('🧭 *NAVIGASI LANGSUNG*')
    lines.push(gmapsDirections(pickupCoord, dropoffCoord))
    lines.push('')
  }

  // Single-pitstop block (used by /cari).
  if (opts.pitstop && opts.pitstop.note.trim()) {
    lines.push('🛑 *STOP*')
    lines.push(opts.pitstop.note.trim())
    if (typeof opts.pitstop.fee === 'number' && opts.pitstop.fee > 0) {
      lines.push(`(biaya pitstop ${idr(opts.pitstop.fee)})`)
    }
    lines.push('')
  }

  // Multi-stop block — free-text only (used by the profile widget).
  const extras = (opts.stops ?? []).map((s) => s.trim()).filter(Boolean)
  if (extras.length > 0) {
    extras.forEach((s, i) => {
      lines.push(`🛑 *STOP ${i + 1}*`)
      lines.push(s)
      lines.push('')
    })
  }

  // Trip distance line (used by /cari).
  if (typeof opts.tripKm === 'number' && Number.isFinite(opts.tripKm)) {
    lines.push(DIVIDER, '', `📏 *Jarak:* ±${opts.tripKm.toFixed(1)} km`, '')
  }

  // Estimate breakdown (used by the profile widget).
  if (opts.estimate) {
    lines.push(
      DIVIDER,
      '',
      `💰 *Estimate (driver's own rate)*`,
      `From ${idr(opts.estimate.minFee)} · ${idr(opts.estimate.pricePerKm)}/km`,
    )
    if (opts.estimate.numStops > 0 && opts.estimate.pitstopFee > 0) {
      const s = opts.estimate.numStops
      lines.push(`Pit-stop fee: ${idr(opts.estimate.pitstopFee)} × ${s} stop${s === 1 ? '' : 's'}`)
    }
    lines.push('')
  }

  lines.push(DIVIDER, '', 'Apakah tersedia? 🙏')
  return lines.join('\n')
}

/**
 * Wraps buildBookingMessage into a full wa.me URL. Returns '' on unusable
 * phone (caller falls back to disabling the CTA).
 */
export function buildBookingWaLink(opts: BookingMessageOptions): string {
  const wa = normaliseE164ForWaMe(opts.driver.whatsapp_e164 ?? '')
  if (!wa) return ''
  return `https://wa.me/${wa}?text=${encodeURIComponent(buildBookingMessage(opts))}`
}
