import Link from 'next/link'
import { Plus } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import RentalList from '@/components/rent/RentalList'
import { listRentalsForCity } from '@/lib/rentals/queries'

export const metadata = {
  title: 'Bike Rental · IndoCity',
  description:
    'Sewa motor di Yogyakarta, Bali, dan kota lain — harian / mingguan / bulanan. ' +
    'Self ride atau dengan driver. Listing langsung dari pemilik & rental shop terpercaya.',
}

export const dynamic = 'force-dynamic'

const SUPPORTED_CITY_SLUGS = [
  'yogyakarta','denpasar','jakarta','bandung','surabaya','medan','semarang',
  'makassar','malang','solo',
]

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>
}) {
  const params = await searchParams
  const city = SUPPORTED_CITY_SLUGS.includes(params.city ?? '')
    ? (params.city as string)
    : 'yogyakarta'
  const rentals = await listRentalsForCity(city)

  return (
    <>
      <AppNav />
      <main className="max-w-3xl mx-auto px-4 pt-3 pb-24">
        {/* Header — title + "List Bike" CTA, same shape as /places. */}
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-tight leading-tight">
              Bike <span className="gradient-text">Rental</span>
            </h1>
            <p className="mt-1 text-[13px] text-muted leading-snug">
              Sewa motor harian, mingguan, atau bulanan. Self ride atau dengan driver.
              Dari pemilik & rental shop terpercaya di kotamu.
            </p>
          </div>
          <Link
            href="/rent/list"
            className="shrink-0 mt-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider text-bg bg-gradient-to-r from-brand to-brand2 border border-black/85 shadow-[0_4px_12px_rgba(250,204,21,0.30)] active:scale-95 transition"
            aria-label="List your bike"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            <span>List Bike</span>
          </Link>
        </header>

        <RentalList rentals={rentals} currentCity={city} />
      </main>
    </>
  )
}
