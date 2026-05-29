// Re-engagement WhatsApp link for the Customer Book.
// Rider opens this to send a friendly check-in to a past customer.
import type { Customer } from '@/data/mockCustomers'

export function reengageLink(c: Customer, riderName: string): string {
  const wa = c.whatsappE164.replace(/[^0-9]/g, '')
  const name = c.displayName ? `, ${c.displayName.split(' ')[0]}` : ''
  const text = [
    `Halo${name}! 👋`,
    '',
    `Ini ${riderName} dari Kita2u 🛵`,
    'Terakhir kita antar-jemput beberapa waktu lalu — semoga semuanya lancar di sisi kakak!',
    '',
    'Kalau hari ini butuh kurir lagi (paket, makanan, atau apapun), saya online dan siap berangkat. Tinggal balas pesan ini saja 🙏',
  ].join('\n')
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`
}

// Shorter "I'm online" broadcast for quick check-ins.
export function quickPingLink(c: Customer, riderName: string): string {
  const wa = c.whatsappE164.replace(/[^0-9]/g, '')
  const text = `Halo kak, ${riderName} Kita2u 🛵 — saya online sekarang. Kalau butuh kurir tinggal chat saya ya!`
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`
}
