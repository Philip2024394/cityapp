import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/profile-view — anonymously records a profile page view.
// Body: { provider_type: string, provider_id: uuid, source?: string }
//
// Each insert fires the bump_provider_visitor_count trigger (mig 0072)
// which increments visitor_count on the matching provider row. Dashboard
// analytics only — count is NEVER surfaced publicly per the founder's
// professional cull (no fabricated social-proof metrics).
//
// Best-effort, swallows errors so a failure here never breaks the
// profile page load.

export const runtime = 'nodejs'

const ALLOWED_TYPES = new Set([
  'driver', 'bike_rental', 'tour_guide',
  'massage', 'beautician', 'laundry', 'handyman', 'home_clean',
])

const ALLOWED_SOURCES = new Set(['direct', 'wa_share', 'social', 'qr'])

type Body = {
  provider_type?: string
  provider_id?:   string
  source?:        string
  anon_session_id?: string
  utm_source?:   string | null
  utm_medium?:   string | null
  utm_campaign?: string | null
  utm_content?:  string | null
  utm_term?:     string | null
}

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length ? s.slice(0, 100) : null
}

export async function POST(req: Request) {
  let body: Body
  try { body = await req.json() as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const providerType = body.provider_type
  const providerId   = body.provider_id
  if (!providerType || !ALLOWED_TYPES.has(providerType)) {
    return NextResponse.json({ error: 'invalid_provider_type' }, { status: 400 })
  }
  if (!providerId || !/^[0-9a-f-]{36}$/i.test(providerId)) {
    return NextResponse.json({ error: 'invalid_provider_id' }, { status: 400 })
  }

  const source = body.source && ALLOWED_SOURCES.has(body.source) ? body.source : 'direct'
  const anon   = (body.anon_session_id ?? '').slice(0, 64) || null

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { error } = await admin
    .from('provider_profile_views')
    .insert({
      provider_type:   providerType,
      provider_id:     providerId,
      anon_session_id: anon,
      source,
      utm_source:   clean(body.utm_source),
      utm_medium:   clean(body.utm_medium),
      utm_campaign: clean(body.utm_campaign),
      utm_content:  clean(body.utm_content),
      utm_term:     clean(body.utm_term),
    })

  if (error) {
    console.warn('[profile-view] insert failed', { code: error.code, message: error.message })
    // Don't 500 the visitor's request over a tracking failure.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
  return NextResponse.json({ ok: true })
}
