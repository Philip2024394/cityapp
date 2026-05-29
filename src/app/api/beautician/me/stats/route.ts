import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// GET /api/beautician/me/stats
// Aggregates the existing provider_profile_views (mig 0072) + the new
// promo_pages + contact_messages (mig 0137) into a single payload for
// /dashboard/beautician/stats. Last 30 days unless ?days=N.

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const url  = new URL(req.url)
  const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get('days') ?? '30', 10) || 30))

  const { data: provider } = await admin
    .from('beautician_providers')
    .select('id, slug, display_name, visitor_count')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!provider) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [viewsRes, promosRes, messagesRes, bookingsRes] = await Promise.all([
    admin.from('provider_profile_views')
      .select('viewed_at, source')
      .eq('provider_type', 'beautician')
      .eq('provider_id',   provider.id)
      .gte('viewed_at',    since)
      .limit(10_000),
    admin.from('promo_pages')
      .select('id, slug, headline, photo_url, view_count, click_count, created_at')
      .eq('provider_type', 'beautician')
      .eq('provider_id',   provider.id)
      .is('archived_at',   null)
      .order('view_count', { ascending: false })
      .limit(20),
    admin.from('contact_messages')
      .select('id, created_at')
      .eq('provider_type', 'beautician')
      .eq('provider_id',   provider.id)
      .gte('created_at',   since)
      .limit(1000),
    admin.from('beautician_bookings')
      .select('id, status, created_at')
      .eq('beautician_id', provider.id)
      .gte('created_at',   since)
      .limit(1000),
  ])

  const views    = viewsRes.data ?? []
  const promos   = promosRes.data ?? []
  const messages = messagesRes.data ?? []
  const bookings = bookingsRes.data ?? []

  // Daily view buckets
  const dailyViewBuckets: Record<string, number> = {}
  for (const v of views) {
    const day = (v.viewed_at as string).slice(0, 10)
    dailyViewBuckets[day] = (dailyViewBuckets[day] ?? 0) + 1
  }
  const dailyViews: Array<{ date: string; count: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const day = d.toISOString().slice(0, 10)
    dailyViews.push({ date: day, count: dailyViewBuckets[day] ?? 0 })
  }

  // Source breakdown
  const sourceBuckets: Record<string, number> = {}
  for (const v of views) {
    const k = (v.source as string | null) ?? 'direct'
    sourceBuckets[k] = (sourceBuckets[k] ?? 0) + 1
  }
  const sources = Object.entries(sourceBuckets)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  // Conversion totals over the window
  const totalViews    = views.length
  const totalMessages = messages.length
  const totalBookings = bookings.length
  const confirmed     = bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length

  return NextResponse.json({
    range: { days, since },
    provider: {
      slug:           provider.slug,
      display_name:   provider.display_name,
      visitor_count:  provider.visitor_count ?? 0,
    },
    totals: {
      views:           totalViews,
      messages:        totalMessages,
      bookings:        totalBookings,
      confirmed,
      conversion_rate: totalViews > 0 ? totalMessages / totalViews : 0,
    },
    dailyViews,
    sources,
    promos: promos.map((p) => ({
      id:          p.id,
      slug:        p.slug,
      headline:    p.headline,
      photo_url:   p.photo_url,
      view_count:  p.view_count,
      click_count: p.click_count,
      ctr:         p.view_count > 0 ? p.click_count / p.view_count : 0,
      created_at:  p.created_at,
    })),
  })
}
