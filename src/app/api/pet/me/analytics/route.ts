import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getMyAccount } from '@/lib/auth/account'

// GET /api/pet/me/analytics
// Task 12/12 — plan-gated retention windows for profile-view analytics
// (Linktree parity). Free = last 28 days. Pro / Studio = last 365 days.
// Schema: provider_profile_views.provider_type = 'pet'.

export const runtime = 'nodejs'

export async function GET() {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const acct = await getMyAccount()
  const plan = acct?.account.plan ?? 'free'
  const retentionDays = (plan === 'pro' || plan === 'studio') ? 365 : 28

  // All provider rows owned by this user — Studio multi-location accounts
  // can have several. We sum views across every page they own.
  const { data: providers, error: providersErr } = await admin
    .from('pet_providers')
    .select('id')
    .eq('user_id', user.id)
  if (providersErr) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
  const providerIds = (providers ?? []).map((p) => p.id as string)
  if (providerIds.length === 0) {
    return NextResponse.json({
      plan,
      retentionDays,
      series: [],
      totalViews: 0,
    })
  }

  const since = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: views, error } = await admin
    .from('provider_profile_views')
    .select('viewed_at')
    .eq('provider_type', 'pet')
    .in('provider_id', providerIds)
    .gte('viewed_at', since)
    .limit(100_000)
  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  const buckets: Record<string, number> = {}
  for (const v of views ?? []) {
    const day = (v.viewed_at as string).slice(0, 10)
    buckets[day] = (buckets[day] ?? 0) + 1
  }
  const series: Array<{ day: string; views: number }> = []
  for (let i = retentionDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const day = d.toISOString().slice(0, 10)
    series.push({ day, views: buckets[day] ?? 0 })
  }
  const totalViews = (views ?? []).length

  return NextResponse.json({
    plan,
    retentionDays,
    series,
    totalViews,
  })
}
