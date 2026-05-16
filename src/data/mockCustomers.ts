// Customer Book entries — derived from quote_events history in production.
// For now, deterministic demo data spread across recent dates.
export type Customer = {
  id: string
  whatsappE164: string
  displayName?: string         // optional — only if customer ever introduced themselves
  totalTrips: number
  totalRevenue: number         // sum of estimated fares across all quotes
  lastContactAt: number        // epoch ms
  lastRoute: string            // "Malioboro → UGM"
  lastFare: number
  cityArea: string
}

const now = Date.now()
const minute = 60_000
const hour = 60 * minute
const day = 24 * hour

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', whatsappE164: '6281234567090', displayName: 'Bu Dewi',
    totalTrips: 8, totalRevenue: 112_000,
    lastContactAt: now - 2 * hour,
    lastRoute: 'Malioboro → UGM Bulaksumur',
    lastFare: 14_500, cityArea: 'Yogyakarta Tengah' },
  { id: 'c2', whatsappE164: '6281234567091', displayName: 'Pak Heri',
    totalTrips: 12, totalRevenue: 168_000,
    lastContactAt: now - 18 * hour,
    lastRoute: 'Tugu Stasiun → Hotel Tentrem',
    lastFare: 12_000, cityArea: 'Yogyakarta Utara' },
  { id: 'c3', whatsappE164: '6281234567092',
    totalTrips: 1, totalRevenue: 10_000,
    lastContactAt: now - 1 * day,
    lastRoute: 'Jl. Solo → Ambarrukmo',
    lastFare: 10_000, cityArea: 'Sleman' },
  { id: 'c4', whatsappE164: '6281234567093', displayName: 'Sari (toko bunga)',
    totalTrips: 23, totalRevenue: 322_000,
    lastContactAt: now - 2 * day,
    lastRoute: 'Kotabaru → Banguntapan',
    lastFare: 17_500, cityArea: 'Kotabaru' },
  { id: 'c5', whatsappE164: '6281234567094',
    totalTrips: 1, totalRevenue: 12_500,
    lastContactAt: now - 3 * day,
    lastRoute: 'UNY → Kafe Bjong',
    lastFare: 12_500, cityArea: 'Caturtunggal' },
  { id: 'c6', whatsappE164: '6281234567095', displayName: 'Ibu Tini',
    totalTrips: 5, totalRevenue: 67_500,
    lastContactAt: now - 4 * day,
    lastRoute: 'Pasar Beringharjo → Kraton',
    lastFare: 12_500, cityArea: 'Kraton' },
  { id: 'c7', whatsappE164: '6281234567096',
    totalTrips: 2, totalRevenue: 25_000,
    lastContactAt: now - 6 * day,
    lastRoute: 'Indomaret Wirobrajan → Hotel Phoenix',
    lastFare: 13_000, cityArea: 'Wirobrajan' },
  { id: 'c8', whatsappE164: '6281234567097', displayName: 'Mas Andre (laundry)',
    totalTrips: 17, totalRevenue: 238_000,
    lastContactAt: now - 9 * day,
    lastRoute: 'Demangan → Plaza Ambarrukmo',
    lastFare: 14_000, cityArea: 'Demangan' },
  { id: 'c9', whatsappE164: '6281234567098',
    totalTrips: 3, totalRevenue: 36_000,
    lastContactAt: now - 14 * day,
    lastRoute: 'Mall Galeria → Condongcatur',
    lastFare: 12_000, cityArea: 'Depok' },
  { id: 'c10', whatsappE164: '6281234567099', displayName: 'Bu Ratna',
    totalTrips: 6, totalRevenue: 84_000,
    lastContactAt: now - 21 * day,
    lastRoute: 'Klinik Adi Sucipto → Apotek K-24',
    lastFare: 14_000, cityArea: 'Maguwoharjo' },
]

export function repeatCustomers(): Customer[] {
  return MOCK_CUSTOMERS.filter(c => c.totalTrips >= 2)
}

export function thisWeek(customers: Customer[]): Customer[] {
  const week = 7 * day
  return customers.filter(c => Date.now() - c.lastContactAt < week)
}

export function totalLeadsValue(customers: Customer[]): number {
  return customers.reduce((s, c) => s + c.totalRevenue, 0)
}
