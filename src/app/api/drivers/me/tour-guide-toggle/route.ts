import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { TOUR_LANGUAGES } from '@/data/tourLanguages'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'

// ============================================================================
// POST /api/drivers/me/tour-guide-toggle
// ----------------------------------------------------------------------------
// Body:
//   { enabled: boolean
//   , dayRateIdr?: number          // 200000..750000
//   , languages?: string[]         // codes from TOUR_LANGUAGES
//   , notes?: string | null }      // ≤ 240 chars
//
// On first enable: defaults dayRateIdr to 350000 (mid-market full-day) and
// languages to ['id'] if the driver hasn't supplied them yet — the
// dashboard collects them in the same submit, so this is just a safety net.
//
// On disable: keeps the config so re-enable restores prior settings.
// ============================================================================

const ALLOWED_LANG_CODES = new Set(TOUR_LANGUAGES.map((l) => l.code))

type Body = {
  enabled?: boolean
  dayRateIdr?: number | null
  languages?: string[]
  notes?: string | null
}

type PriorRow = {
  tour_guide_enabled: boolean | null
  tour_guide_day_rate_idr: number | null
  tour_guide_languages: string[] | null
  tour_guide_enabled_at: string | null
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  const { data: priorRaw } = await admin
    .from('drivers')
    .select('tour_guide_enabled, tour_guide_day_rate_idr, tour_guide_languages, tour_guide_enabled_at')
    .eq('user_id', user.id)
    .maybeSingle()
  const prior = priorRaw as PriorRow | null

  const update: TableUpdate<'drivers'> = { tour_guide_enabled: body.enabled }

  // Day rate — clamp + default on first enable.
  if (body.dayRateIdr !== undefined) {
    const rate = body.dayRateIdr === null ? null : Math.round(Number(body.dayRateIdr))
    if (rate !== null && (!Number.isFinite(rate) || rate < 200_000 || rate > 750_000)) {
      return NextResponse.json({ error: 'dayRateIdr must be between 200000 and 750000' }, { status: 400 })
    }
    update.tour_guide_day_rate_idr = rate
  } else if (body.enabled && prior?.tour_guide_day_rate_idr == null) {
    update.tour_guide_day_rate_idr = 350_000
  }

  // Languages — whitelist + default to ['id'] if not provided on first enable.
  if (Array.isArray(body.languages)) {
    const clean = body.languages.filter((c) => typeof c === 'string' && ALLOWED_LANG_CODES.has(c as never))
    update.tour_guide_languages = clean
  } else if (body.enabled && (!prior?.tour_guide_languages || prior.tour_guide_languages.length === 0)) {
    update.tour_guide_languages = ['id']
  }

  if (body.notes !== undefined) {
    const trimmed = body.notes === null ? null : String(body.notes).slice(0, 240)
    update.tour_guide_notes = trimmed
  }

  // Stamp enabled_at on first activation.
  if (body.enabled && !prior?.tour_guide_enabled_at) {
    update.tour_guide_enabled_at = new Date().toISOString()
  }

  const { error } = await admin
    .from('drivers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    enabled: body.enabled,
    dayRateIdr: update.tour_guide_day_rate_idr ?? prior?.tour_guide_day_rate_idr ?? null,
    languages: update.tour_guide_languages ?? prior?.tour_guide_languages ?? [],
  })
}
