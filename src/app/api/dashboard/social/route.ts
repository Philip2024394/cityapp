// ============================================================================
// GET  /api/dashboard/social — return the authenticated driver's quota
// POST /api/dashboard/social — record one share (increments counter)
// ----------------------------------------------------------------------------
// Used by the /dashboard/car/social and /dashboard/rider/social composer
// pages. Quota is per (driver_user_id × calendar_month_YYYY-MM); cap is
// SOCIAL_QUOTA_MONTHLY (20). When the cap is hit, the POST returns 429
// and the composer disables share buttons.
//
// All writes go through the service-role client because the
// social_share_quota table's RLS only permits self-SELECT. Auth gate is
// handled here by reading the user's Supabase session cookie.
// ============================================================================

import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { SOCIAL_QUOTA_MONTHLY } from '@/lib/social/banners'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function currentMonth(): string {
  // YYYY-MM in WIB (UTC+7) — matches the driver's local calendar so
  // resets land at midnight Jakarta time on the 1st.
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 7)
}

type QuotaState = {
  month: string
  used: number
  cap: number
  remaining: number
}

// Driver basics needed by the SharePreviewModal — kept under a separate
// shape so the existing quota consumers stay backward-compatible.
type DriverBasics = {
  business_name:     string
  slug:              string
  brand_logo_url:    string | null
  city:              string | null
}

async function readQuota(userId: string): Promise<QuotaState> {
  const admin = getAdminSupabase()
  if (!admin) return { month: currentMonth(), used: 0, cap: SOCIAL_QUOTA_MONTHLY, remaining: SOCIAL_QUOTA_MONTHLY }
  const month = currentMonth()
  const { data } = await admin
    .from('social_share_quota')
    .select('count')
    .eq('driver_user_id', userId)
    .eq('month_yyyy_mm', month)
    .maybeSingle()
  const used = (data?.count as number | undefined) ?? 0
  return { month, used, cap: SOCIAL_QUOTA_MONTHLY, remaining: Math.max(0, SOCIAL_QUOTA_MONTHLY - used) }
}

// Best-effort lookup; if the row is missing we return safe defaults so
// the share modal can still render (it falls back to slug/empty city).
async function readDriverBasics(userId: string): Promise<DriverBasics> {
  const admin = getAdminSupabase()
  const fallback: DriverBasics = {
    business_name:  'CityRiders Driver',
    slug:           '',
    brand_logo_url: null,
    city:           null,
  }
  if (!admin) return fallback
  const { data } = await admin
    .from('drivers')
    .select('business_name, slug, brand_logo_url, city')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return fallback
  return {
    business_name:  (data.business_name as string | null) ?? fallback.business_name,
    slug:           (data.slug as string | null) ?? '',
    brand_logo_url: (data.brand_logo_url as string | null) ?? null,
    city:           (data.city as string | null) ?? null,
  }
}

export async function GET() {
  const supabase = await getServerSupabase()
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })
  // The GET response keeps the original QuotaState fields at the top
  // level (callers like the composer already destructure month/used/cap/
  // remaining) and adds a `driver` block alongside. This preserves
  // backward compatibility with any older client still reading just the
  // quota numbers.
  const [quota, driver] = await Promise.all([
    readQuota(user.id),
    readDriverBasics(user.id),
  ])
  return NextResponse.json({ ...quota, driver })
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase()
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { banner_id?: string; platform?: string }
  try { body = await req.json() } catch { body = {} }
  const banner_id = typeof body.banner_id === 'string' ? body.banner_id.slice(0, 64) : null
  const platform  = typeof body.platform  === 'string' ? body.platform.toLowerCase().slice(0, 32) : null

  const current = await readQuota(user.id)
  if (current.remaining <= 0) {
    return NextResponse.json(
      { error: 'quota_exceeded', ...current },
      { status: 429 },
    )
  }

  // Upsert by (driver_user_id, month_yyyy_mm) — increment count, stamp
  // the last_banner/platform/at fields for analytics.
  const next = current.used + 1
  await admin
    .from('social_share_quota')
    .upsert(
      {
        driver_user_id:  user.id,
        month_yyyy_mm:   current.month,
        count:           next,
        last_banner_id:  banner_id,
        last_platform:   platform,
        last_shared_at:  new Date().toISOString(),
      },
      { onConflict: 'driver_user_id,month_yyyy_mm' },
    )

  return NextResponse.json({
    month:     current.month,
    used:      next,
    cap:       current.cap,
    remaining: Math.max(0, current.cap - next),
  })
}
