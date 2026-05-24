import { redirect, notFound } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'
import TourGuideEditForm from './TourGuideEditForm'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  name: string
  whatsapp_e164: string
  city: string
  address: string | null
  lat: number | null
  lng: number | null
  services: string[]
  languages: string[]
  day_rate_idr: number | null
  notes: string | null
  // mig 0072 universal profile fields
  cover_image_url: string | null
  gallery_image_urls: string[] | null
  instagram_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  operating_hours: Record<string, string> | null
  certifications: string[] | null
  user_id: string | null
}

export default async function TourGuideEditPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getServerSupabase()
  if (!supabase) return <p className="p-6 text-muted">Server not configured.</p>

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/dashboard/tour-guide/${id}/edit`)

  // RLS scopes to owner — wrong id returns null.
  // owner_user_id is aliased to user_id so the client form has a stable
  // prop name matching the other dashboards' mental model.
  const { data } = await supabase
    .from('tour_guide_listings')
    .select('id, name, whatsapp_e164, city, address, lat, lng, services, languages, day_rate_idr, notes, cover_image_url, gallery_image_urls, instagram_url, tiktok_url, facebook_url, operating_hours, certifications, user_id:owner_user_id')
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()

  return <TourGuideEditForm row={data as Row} />
}
