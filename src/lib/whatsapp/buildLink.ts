import { idr } from '@/lib/format/idr'

export type Coord = { lat: number; lng: number; label?: string }

export type WhatsAppQuoteArgs = {
  riderName: string
  riderWhatsAppE164: string
  pickup: Coord
  dropoff: Coord
  distanceKm: number
  pricePerKm: number
  fare: number              // trip fare BEFORE pitstop fee
  /** Estimated travel time in minutes. Computed from distance + average
   *  city speed by the caller — included in the WhatsApp body so the
   *  driver sees ETA alongside distance/price. */
  etaMin?: number
  /** Optional pit-stop request. If set, adds a 🛑 line + the rider's
   *  pitstop fee to the total. Item costs are NOT included — handled
   *  separately between customer + rider via GoPay/QRIS. */
  pitstop?: {
    note: string             // what the customer wants done
    fee: number              // rider's fee for the stop (0 = free)
  }
}

// Normalises a stored phone string into a wa.me digits-only number.
// Drops the leading + and rejects strings that don't look like
// Indonesian (62…) — silently returns '' so the caller can refuse to
// open a malformed link rather than launching WhatsApp to a wrong
// number. UI catches the empty string and shows an error toast.
export function normaliseE164ForWaMe(raw: string): string {
  const digits = (raw || '').replace(/[^0-9]/g, '')
  // Accept either 62XXXXXXXXX (already E.164) or 0XXXXXXXX (local) —
  // convert leading 0 to 62. Reject anything else outright.
  if (digits.startsWith('62') && digits.length >= 10) return digits
  if (digits.startsWith('0') && digits.length >= 9) return '62' + digits.slice(1)
  return ''
}

function gmapsPin(c: Coord): string {
  // Google Maps query link — taps to the place pin in the native Maps
  // app on Android/iOS, opens google.com/maps in browser otherwise.
  return `https://www.google.com/maps?q=${c.lat.toFixed(6)},${c.lng.toFixed(6)}`
}

function gmapsDirections(from: Coord, to: Coord): string {
  // Tap-to-navigate URL — launches turn-by-turn straight into the
  // Maps app. The driver doesn't need to copy coordinates anywhere.
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat.toFixed(6)},${from.lng.toFixed(6)}&destination=${to.lat.toFixed(6)},${to.lng.toFixed(6)}&travelmode=driving`
}

// Format an ETA in minutes into a short Indonesian string. Sub-hour
// trips: "12 min". Hour+: "1 jam 5 min". Falls back to '' on bad input
// so the caller can drop the line entirely.
function formatEta(min: number | undefined): string {
  if (typeof min !== 'number' || !Number.isFinite(min) || min <= 0) return ''
  const m = Math.round(min)
  if (m < 60) return `${m} menit`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h} jam` : `${h} jam ${rest} menit`
}

// Produces a wa.me link with a fully-formatted Indonesian booking message.
// Includes Google Maps pins (clickable in WhatsApp) for pickup + dropoff
// AND a single tap-to-navigate Directions link so the driver doesn't
// need to copy/paste coordinates anywhere. Returns '' when the phone
// number is unusable — caller must check before opening.
export function buildWhatsAppLink(a: WhatsAppQuoteArgs): string {
  const wa = normaliseE164ForWaMe(a.riderWhatsAppE164)
  if (!wa) return ''
  const pickupUrl = gmapsPin(a.pickup)
  const dropoffUrl = gmapsPin(a.dropoff)
  const directionsUrl = gmapsDirections(a.pickup, a.dropoff)

  const hasPit = !!a.pitstop && a.pitstop.note.trim().length > 0
  const total = a.fare + (hasPit ? a.pitstop!.fee : 0)
  const etaStr = formatEta(a.etaMin)

  // Customer's local time — matches the rider's clock since both are in
  // Indonesia. Format: "Senin, 18 Mei 2026" and "14:32".
  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  })

  const divider = '━━━━━━━━━━━━━━━━━━'

  const lines: string[] = [
    '*🛵 PEMESANAN BARU — CITY RIDER*',
    '',
    `Halo *${a.riderName}*! 👋`,
    '',
    `📅 *Tanggal:* ${dateStr}`,
    `🕐 *Waktu:* ${timeStr}`,
    '',
    divider,
    '',
    '📍 *JEMPUT*',
    a.pickup.label ?? 'Lokasi saya',
    pickupUrl,
    '',
  ]

  if (hasPit) {
    lines.push('🛑 *PITSTOP*')
    lines.push(a.pitstop!.note)
    if (a.pitstop!.fee > 0) {
      lines.push(`(biaya pitstop ${idr(a.pitstop!.fee)})`)
    } else {
      lines.push('(gratis — tidak ada biaya tambahan)')
    }
    lines.push('💡 Untuk biaya barang, mohon transfer dulu via GoPay/QRIS sebelum berangkat ya kak.')
    lines.push('')
  }

  lines.push(
    '🏁 *ANTAR*',
    a.dropoff.label ?? 'Lokasi tujuan',
    dropoffUrl,
    '',
    '🧭 *Navigasi langsung:*',
    directionsUrl,
    '',
    divider,
    '',
    `📏 *Jarak:* ±${a.distanceKm.toFixed(1)} km`,
  )
  if (etaStr) lines.push(`⏱️ *Estimasi waktu:* ±${etaStr}`)
  lines.push(
    `💰 *Estimasi total:* ${idr(total)}`,
    `       ${idr(a.fare)} ongkos kurir${hasPit && a.pitstop!.fee > 0 ? ` + ${idr(a.pitstop!.fee)} pitstop` : ''}`,
    '',
    divider,
    '',
    '⚡ *Mohon buka aplikasi IndoCity sekarang untuk TERIMA BOOKING ini.*',
    '',
    'Terima kasih! 🙏',
  )

  return `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`
}
