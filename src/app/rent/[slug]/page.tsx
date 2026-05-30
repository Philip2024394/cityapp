import { notFound } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'
import RentProfileClient, { type BikeRentalPublic } from './RentProfileClient'
import PoweredByKita2u from '@/components/kita/PoweredByKita2u'

// Public detail page for an approved bike rental listing. Server-rendered
// for SEO — bike_rentals row is fetched here in the async server
// component, then handed to a client child for the interactive profile
// JSX (mirrors the beautician/[slug] layout 1:1: hero, floating info-
// card, About, Services chips, portfolio gallery, pricing block, Visit Us
// panel, reviews panel, sticky contact bar).
//
// status='approved' filter prevents pending/rejected leakage; the bike
// rentals table already has column-coarse anon SELECT RLS (mig 0072) so
// the server-side query works under the anon key.

export const dynamic = 'force-dynamic'

export default async function RentalDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const lowered = String(slug || '').toLowerCase()
  if (!lowered || !/^[a-z0-9_-]+$/.test(lowered)) notFound()

  const supabase = await getServerSupabase()
  if (!supabase) notFound()

  const { data } = await supabase
    .from('bike_rentals')
    .select(
      'id, slug, owner_name, owner_company, owner_whatsapp_e164, ' +
      'brand, model, year, cc, transmission, bike_type, color, description, ' +
      'image_urls, cover_image_url, ' +
      'daily_price_idr, weekly_price_idr, monthly_price_idr, ' +
      'security_deposit_idr, driver_rate_per_day_idr, ' +
      'tour_3h_idr, tour_6h_idr, tour_8h_idr, fuel_included, ' +
      'helmet_count, raincoat_count, ' +
      'has_phone_holder, has_phone_charger, has_delivery_box, ' +
      'delivers_to_hotel, delivers_to_villa, pickup_dropoff, ' +
      'rental_mode, city, address, lat, lng, ' +
      'rating, review_count, ' +
      'instagram_url, tiktok_url, facebook_url, operating_hours',
    )
    .eq('slug', lowered)
    .eq('status', 'approved')
    .maybeSingle()

  if (!data) notFound()
  const row = data as unknown as BikeRentalPublic

  return (
    <>
      <RentProfileClient row={row} />
      <PoweredByKita2u defaultVertical="property" />
    </>
  )
}
