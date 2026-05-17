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
// can navigate without any extra back-and-forth, plus a booking date /
// time header and a CTA telling the rider to accept the booking inside
// the City Rider driver app. WhatsApp renders *text* as bold.
export function buildWhatsAppLink(a: WhatsAppQuoteArgs): string {
  const wa = a.riderWhatsAppE164.replace(/[^0-9]/g, '')
  const pickupUrl = osmLink(a.pickup)
  const dropoffUrl = osmLink(a.dropoff)

  const hasPit = !!a.pitstop && a.pitstop.note.trim().length > 0
  const total = a.fare + (hasPit ? a.pitstop!.fee : 0)

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
    divider,
    '',
    `📏 *Jarak:* ±${a.distanceKm.toFixed(1)} km`,
    `💰 *Estimasi total:* ${idr(total)}`,
    `       ${idr(a.fare)} ongkos kurir${hasPit && a.pitstop!.fee > 0 ? ` + ${idr(a.pitstop!.fee)} pitstop` : ''}`,
    '',
    divider,
    '',
    '⚡ *Mohon buka aplikasi City Rider sekarang untuk TERIMA BOOKING ini.*',
    '',
    'Terima kasih! 🙏',
  )

  return `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`
}

function osmLink(c: Coord): string {
  return `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=18/${c.lat}/${c.lng}`
}
