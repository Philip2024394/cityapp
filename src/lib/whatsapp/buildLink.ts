import { idr } from '@/lib/format/idr'

export type Coord = { lat: number; lng: number; label?: string }

export type WhatsAppQuoteArgs = {
  riderName: string
  riderWhatsAppE164: string
  pickup: Coord
  dropoff: Coord
  distanceKm: number
  pricePerKm: number
  fare: number
}

// Produces a wa.me link with a fully-formatted Indonesian booking message.
// Includes both OSM location pins (clickable in WhatsApp) so the rider
// can navigate without any extra back-and-forth.
export function buildWhatsAppLink(a: WhatsAppQuoteArgs): string {
  const wa = a.riderWhatsAppE164.replace(/[^0-9]/g, '')
  const pickupUrl = osmLink(a.pickup)
  const dropoffUrl = osmLink(a.dropoff)
  const text = [
    `Halo ${a.riderName}! 👋`,
    '',
    'Saya mau pesan kurir bike via City Rider:',
    '',
    '📍 Jemput',
    `   ${a.pickup.label ?? 'Lokasi saya'}`,
    `   ${pickupUrl}`,
    '',
    '📍 Antar',
    `   ${a.dropoff.label ?? 'Lokasi tujuan'}`,
    `   ${dropoffUrl}`,
    '',
    `📏 Jarak: ±${a.distanceKm.toFixed(1)} km`,
    `💰 Estimasi: ${idr(a.fare)} (${idr(a.pricePerKm)}/km)`,
    '',
    'Bisa berangkat sekarang?',
  ].join('\n')
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`
}

function osmLink(c: Coord): string {
  return `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=18/${c.lat}/${c.lng}`
}
