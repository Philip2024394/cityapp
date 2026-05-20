import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/drivers/me/virality
// ----------------------------------------------------------------------------
// Single-shot fetch for the dashboard's virality surfaces:
//   • referralCode + shareable URL
//   • list of drivers the caller has referred (with reward status)
//   • months of subscription credit earned
//   • caller's leaderboard rank within their city
//   • buddy info — mentor (if caller is a new driver) or mentees (if caller mentors)
//
// All gated on the authenticated session; no public access.
// ============================================================================

export async function GET() {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  // Caller's driver row — for referral_code + city (rank lookup).
  const { data: me } = await admin
    .from('drivers')
    .select('user_id, slug, referral_code, city, rating, trips_count, created_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!me) return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })

  // Referred drivers — list with status. Order newest-first.
  const { data: referredRows } = await admin
    .from('drivers')
    .select('user_id, business_name, slug, city, created_at, brand_logo_url, rating, trips_count')
    .eq('referrer_driver_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Rewards summary — one row per referred driver, status pending/granted.
  const { data: rewardRows } = await admin
    .from('driver_referral_rewards')
    .select('referred_driver_id, months_granted, status')
    .eq('referrer_driver_id', user.id)

  const referrals = (referredRows ?? []).map((r) => {
    const reward = rewardRows?.find((x) => x.referred_driver_id === r.user_id)
    return {
      driverId: r.user_id,
      name: r.business_name,
      slug: r.slug,
      city: r.city,
      photoUrl: r.brand_logo_url,
      joinedAt: r.created_at,
      rating: r.rating,
      tripsCount: r.trips_count,
      rewardStatus: reward?.status ?? 'pending',
      monthsGranted: reward?.months_granted ?? 0,
    }
  })

  const monthsEarned = (rewardRows ?? [])
    .filter((r) => r.status === 'granted')
    .reduce((sum, r) => sum + (r.months_granted ?? 0), 0)
  const monthsPending = (rewardRows ?? [])
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + (r.months_granted ?? 0), 0)

  // Leaderboard rank within city — ordered by rating desc, trips desc, tenure asc.
  // Tied drivers get sorted deterministically by tenure (older first).
  let rank: number | null = null
  let cityTotal: number | null = null
  if (me.city) {
    const { data: cityDrivers } = await admin
      .from('drivers')
      .select('user_id, rating, trips_count, created_at')
      .eq('city', me.city)
      .eq('status', 'active')
      .order('rating',       { ascending: false, nullsFirst: false })
      .order('trips_count',  { ascending: false, nullsFirst: false })
      .order('created_at',   { ascending: true })
      .limit(500)
    if (cityDrivers && cityDrivers.length > 0) {
      cityTotal = cityDrivers.length
      const idx = cityDrivers.findIndex((d) => d.user_id === me.user_id)
      rank = idx >= 0 ? idx + 1 : null
    }
  }

  // Buddy pairing — mentor for this driver (if any) + mentees (if any).
  const { data: mentorRow } = await admin
    .from('driver_buddies')
    .select('mentor_user_id, paired_at, graduated_at')
    .eq('mentee_user_id', user.id)
    .maybeSingle()

  let mentor: { name: string; slug: string; photoUrl: string | null; pairedAt: string } | null = null
  if (mentorRow?.mentor_user_id) {
    const { data: m } = await admin
      .from('drivers')
      .select('business_name, slug, brand_logo_url')
      .eq('user_id', mentorRow.mentor_user_id)
      .maybeSingle()
    if (m) {
      mentor = {
        name: m.business_name,
        slug: m.slug,
        photoUrl: m.brand_logo_url,
        pairedAt: mentorRow.paired_at,
      }
    }
  }

  const { data: menteeRows } = await admin
    .from('driver_buddies')
    .select('mentee_user_id, paired_at, graduated_at')
    .eq('mentor_user_id', user.id)
    .is('graduated_at', null)
    .order('paired_at', { ascending: false })
    .limit(10)

  let mentees: Array<{ name: string; slug: string; photoUrl: string | null; pairedAt: string }> = []
  if (menteeRows && menteeRows.length > 0) {
    const ids = menteeRows.map((m) => m.mentee_user_id)
    const { data: dlist } = await admin
      .from('drivers')
      .select('user_id, business_name, slug, brand_logo_url')
      .in('user_id', ids)
    mentees = menteeRows.map((m) => {
      const d = dlist?.find((x) => x.user_id === m.mentee_user_id)
      return {
        name: d?.business_name ?? '—',
        slug: d?.slug ?? '',
        photoUrl: d?.brand_logo_url ?? null,
        pairedAt: m.paired_at,
      }
    })
  }

  return NextResponse.json({
    referralCode: me.referral_code,
    referralUrl:  me.referral_code ? `/?ref=${encodeURIComponent(me.referral_code)}` : null,
    referrals,
    monthsEarned,
    monthsPending,
    rank,
    cityTotal,
    city: me.city,
    mentor,
    mentees,
  })
}
