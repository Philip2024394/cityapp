import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// PATCH /api/beautician/me/busy-dates
// Beautician toggles a date as unavailable on their own calendar.
// Body shape supports two operations:
//   { add: "2026-06-12" }     → append the date if absent
//   { remove: "2026-06-12" }  → drop it
//   { dates: ["2026-06-12", "2026-06-15"] } → replace the whole array
// All values must match YYYY-MM-DD; the API rejects anything else so the
// customer-side calendar can trust the stored list verbatim.

export const runtime = 'nodejs'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isDate(v: unknown): v is string {
  return typeof v === 'string' && DATE_RE.test(v)
}

export async function PATCH(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { add?: string; remove?: string; dates?: string[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { data: bp } = await admin
    .from('beautician_providers')
    .select('id, busy_dates')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!bp) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  const current: string[] = Array.isArray(bp.busy_dates)
    ? bp.busy_dates.filter(isDate)
    : []
  let next: string[] = current

  if (body.dates !== undefined) {
    if (!Array.isArray(body.dates)) {
      return NextResponse.json({ error: 'invalid_dates' }, { status: 400 })
    }
    const cleaned = body.dates.filter(isDate)
    if (cleaned.length !== body.dates.length) {
      return NextResponse.json({ error: 'invalid_date_in_array' }, { status: 400 })
    }
    if (cleaned.length > 200) {
      return NextResponse.json({ error: 'too_many_dates' }, { status: 400 })
    }
    next = Array.from(new Set(cleaned)).sort()
  } else if (body.add !== undefined) {
    if (!isDate(body.add)) return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
    next = current.includes(body.add) ? current : [...current, body.add].sort()
  } else if (body.remove !== undefined) {
    if (!isDate(body.remove)) return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
    next = current.filter((d) => d !== body.remove)
  } else {
    return NextResponse.json({ error: 'no_op' }, { status: 400 })
  }

  const { error } = await admin
    .from('beautician_providers')
    .update({ busy_dates: next })
    .eq('id', bp.id)
  if (error) {
    console.error('[me/busy-dates] update failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, busy_dates: next })
}
