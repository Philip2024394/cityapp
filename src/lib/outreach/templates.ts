// Outreach message templates — copy-paste into WhatsApp / email.
// Keep messages SHORT and personal — Indonesian shop owners react to
// voice-note tone, not formal copy.

export type OutreachCategory =
  | 'bike_rental' | 'driver' | 'massage' | 'tour_guide'
  | 'partner_venue' | 'food_vendor' | 'other'

export const CATEGORY_LABELS: Record<OutreachCategory, string> = {
  bike_rental:   'Bike rental shop',
  driver:        'Motorbike driver',
  massage:       'Massage therapist',
  tour_guide:    'Tour guide',
  partner_venue: 'Hotel / villa / partner',
  food_vendor:   'Food vendor',
  other:         'Other',
}

type Template = { id: string; lang: 'id' | 'en'; label: string; body: string }

// {{name}}, {{city}} placeholders — replaced at copy time.
export const WHATSAPP_TEMPLATES: Record<OutreachCategory, Template[]> = {
  bike_rental: [
    {
      id: 'rental-id-1', lang: 'id', label: 'Bahasa — intro singkat',
      body: `Halo {{name}}, saya Philip dari IndoCity.

Kami platform baru yang list rental motor di {{city}} untuk turis lokal & asing — kontak langsung lewat WhatsApp, 0% komisi.

Listing pertama gratis 7 hari, lalu Rp 38.000/bulan flat. Banyak rental sudah dapat extra booking minggu pertama.

Boleh saya kirim contoh listing-nya?`,
    },
    {
      id: 'rental-en-1', lang: 'en', label: 'English — quick intro',
      body: `Hi {{name}}, I'm Philip from IndoCity.

We're a new listing platform for bike rentals in {{city}} — direct WhatsApp contact, 0% commission per booking.

First listing free for 7 days, then Rp 38,000/month flat. Most shops get 1+ extra booking in the first week.

Can I send you an example listing?`,
    },
  ],
  driver: [
    {
      id: 'driver-id-1', lang: 'id', label: 'Bahasa — untuk driver',
      body: `Bro/Sis {{name}}, saya Philip dari IndoCity.

Platform untuk rider independen — kamu yang set harga, customer kontak kamu langsung lewat WhatsApp. Gak ada komisi per order.

Rp 38.000/bulan flat. Trial 7 hari gratis dulu.

Mau saya kirim link daftarnya?`,
    },
  ],
  massage: [
    {
      id: 'massage-id-1', lang: 'id', label: 'Bahasa — terapis',
      body: `Halo {{name}}, saya Philip dari IndoCity Wellness.

Kami list terapis pijat untuk panggilan ke hotel dan rumah di {{city}}. Customer kontak langsung lewat WhatsApp, harga 60/90/120 menit kamu yang atur.

Rp 38.000/bulan setelah trial 7 hari. 0% komisi.

Boleh saya jelaskan lebih lanjut?`,
    },
  ],
  tour_guide: [
    {
      id: 'tour-id-1', lang: 'id', label: 'Bahasa — tour guide',
      body: `Halo {{name}}, saya Philip dari IndoCity Tours.

Platform untuk tour guide independen di {{city}} — pasang spesialisasi, harga harian, customer kontak langsung via WhatsApp.

Trial gratis 7 hari, lalu Rp 38.000/bulan.

Mau saya kirim contoh profil?`,
    },
  ],
  partner_venue: [
    {
      id: 'partner-id-1', lang: 'id', label: 'Bahasa — hotel/villa partner',
      body: `Halo {{name}}, saya Philip dari IndoCity Partner Program.

Gratis untuk hotel/villa: cetak QR di lobby, tamu kamu booking kurir/rental/massage via IndoCity, kamu dapat 8% komisi otomatis tiap booking.

Driver bayar mingguan ke rekening kamu langsung — kami cuma platform ledger.

Tertarik? Saya bisa kirim cara daftarnya.`,
    },
  ],
  food_vendor: [
    {
      id: 'food-id-1', lang: 'id', label: 'Bahasa — warung/resto',
      body: `Halo {{name}}, saya Philip dari StreetLocal.

Aplikasi PWA untuk warung/resto: terima order WhatsApp, customer ownership, integrasi printer dapur. Rp 38.000/bulan, 0% komisi.

Tidak perlu ada di Apple/Google Store — instant pakai link.

Boleh saya kirim demo?`,
    },
  ],
  other: [],
}

// Google Maps search queries — admin clicks → opens Maps in a new tab
// → manually copies shop names + WA numbers + emails (which are publicly
// displayed by the shop owners themselves on their listings).
export const GMAPS_QUERIES: Record<OutreachCategory, (city: string) => string[]> = {
  bike_rental: (city) => [
    `rental motor ${city}`,
    `motorbike rental ${city}`,
    `sewa motor ${city}`,
    `scooter rental ${city}`,
  ],
  driver: (city) => [
    `kurir motor ${city}`,
    `ojek pangkalan ${city}`,
    `delivery motor ${city}`,
  ],
  massage: (city) => [
    `massage panggilan ${city}`,
    `spa ${city}`,
    `pijat tradisional ${city}`,
  ],
  tour_guide: (city) => [
    `tour guide ${city}`,
    `private tour ${city}`,
    `local guide ${city}`,
  ],
  partner_venue: (city) => [
    `hotel ${city}`,
    `villa ${city}`,
    `guesthouse ${city}`,
  ],
  food_vendor: (city) => [
    `warung ${city}`,
    `restaurant ${city}`,
    `cafe ${city}`,
  ],
  other: () => [],
}

export function fillTemplate(t: string, vars: { name?: string; city?: string }): string {
  return t
    .replace(/\{\{name\}\}/g, vars.name?.trim() || 'di sana')
    .replace(/\{\{city\}\}/g, vars.city?.trim() || 'kota Anda')
}

export function gmapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`
}
