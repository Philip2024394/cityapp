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
  /** Optional pit-stop request. If set, adds a 🛑 line + the rider's
   *  pitstop fee to the total. Item costs are NOT included — handled
   *  separately between customer + rider via GoPay/QRIS. */
  pitstop?: {
    note: string             // what the customer wants done
    fee: number              // rider's fee for the stop (0 = free)
  }
}

// Produces a wa.me link with a fully-formatted Indonesian booking message.
// Includes both OSM location pins (clickable in WhatsApp) so the rider
// can navigate without any extra back-and-forth.
export function buildWhatsAppLink(a: WhatsAppQuoteArgs): string {
  const wa = a.riderWhatsAppE164.replace(/[^0-9]/g, '')
  const pickupUrl = osmLink(a.pickup)
  const dropoffUrl = osmLink(a.dropoff)

  const hasPit = !!a.pitstop && a.pitstop.note.trim().length > 0
  const total = a.fare + (hasPit ? a.pitstop!.fee : 0)

  const lines: string[] = [
    `Halo ${a.riderName}! 👋`,
    '',
    'Saya mau pesan kurir bike via City Rider:',
    '',
    '📍 Jemput',
    `   ${a.pickup.label ?? 'Lokasi saya'}`,
    `   ${pickupUrl}`,
    '',
  ]

  if (hasPit) {
    lines.push('🛑 Pitstop')
    lines.push(`   ${a.pitstop!.note}`)
    if (a.pitstop!.fee > 0) {
      lines.push(`   (biaya pitstop ${idr(a.pitstop!.fee)})`)
    } else {
      lines.push('   (gratis — tidak ada biaya tambahan)')
    }
    lines.push('   💡 Untuk biaya barang, mohon transfer dulu via GoPay/QRIS sebelum berangkat ya kak.')
    lines.push('')
  }

  lines.push(
    '📍 Antar',
    `   ${a.dropoff.label ?? 'Lokasi tujuan'}`,
    `   ${dropoffUrl}`,
    '',
    `📏 Jarak: ±${a.distanceKm.toFixed(1)} km`,
    `💰 Estimasi: ${idr(total)}`,
    `   (${idr(a.fare)} ongkos kurir${hasPit && a.pitstop!.fee > 0 ? ` + ${idr(a.pitstop!.fee)} pitstop` : ''})`,
    '',
    'Bisa berangkat sekarang?',
  )

  return `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`
}

function osmLink(c: Coord): string {
  return `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=18/${c.lat}/${c.lng}`
}
