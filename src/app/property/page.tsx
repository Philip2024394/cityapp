import Link from 'next/link'
import PropertyBrowser, { type PropertyRow } from '@/components/property/PropertyBrowser'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// /property — Browse view. White-card shell mirroring /food + /places so the
// platform has ONE card-page design across every category.
// ============================================================================

export const metadata = {
  title: 'Property · IndoCity',
  description: 'Browse self-listed property — sales, rentals, and new construction across Indonesia.',
  alternates: { canonical: 'https://indocity.id/property' },
}

export const dynamic = 'force-dynamic'

const DEFAULT_CITY = 'yogyakarta'

function capitalise(s: string): string {
  if (!s) return s
  return s[0]!.toUpperCase() + s.slice(1)
}

async function loadListings(city: string): Promise<PropertyRow[]> {
  const admin = getAdminSupabase()
  if (!admin) return []
  const { data } = await admin
    .from('property_listings')
    .select('id, slug, display_name, business_name, listing_type, property_type, city, cover_image_url, image_urls, gallery_image_urls, price_idr, monthly_rent_idr, starting_price_idr, bedrooms, building_size_sqm')
    .eq('status', 'active')
    .eq('city', city)
    .is('mock_hidden_at', null)
    .order('created_at', { ascending: false })
    .limit(48)
  return (data ?? []) as PropertyRow[]
}

export default async function PropertyBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>
}) {
  const params = await searchParams
  const currentCity = (params.city || DEFAULT_CITY).toLowerCase()
  const listings = await loadListings(currentCity)
  const currentCityLabel = capitalise(currentCity)

  return (
    <main
      className="relative min-h-[100dvh]"
      style={{ background: '#FFFFFF', color: '#0A0A0A' }}
    >
      {/* HEADER — same IndoCity wordmark as /food + /places. */}
      <header className="relative z-30 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center hover:opacity-85 transition"
            aria-label="IndoCity home"
          >
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              Ind
            </span>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] mx-[1px] translate-y-[3px]"
            >
              <path
                d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
                fill="#FACC15"
              />
              <circle cx="12" cy="10" r="3" fill="#FFFFFF" />
            </svg>
            <span
              className="font-black tracking-tight text-[24px] sm:text-[28px] leading-none"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
            >
              City
            </span>
          </Link>
        </div>
      </header>

      {/* WHITE CARD CONTAINER — same shell as /food + /places. */}
      <div className="px-[15px] pb-10">
        <PropertyBrowser
          listings={listings}
          currentCityLabel={currentCityLabel}
        />
      </div>
    </main>
  )
}
