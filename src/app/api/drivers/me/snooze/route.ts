import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// PATCH /api/drivers/me/snooze
// ----------------------------------------------------------------------------
// Driver-initiated self-snooze. Sets drivers.snoozed_until = now() + Nh
// (default 48). Body: { hours?: number } — clamped to [1, 168] (1h to 7d).
// Posting { clear: true } drops the snooze immediately.
//
// LEGAL POSTURE (Permenhub PM 12/2019 + 118/2018):
//   This endpoint is intentionally DRIVER-ONLY (auth.uid() must be the
//   driver). The platform never sets snoozed_until in reaction to a
//   customer WhatsApp tap, a "decline", or a dispatched-job concept —
//   none of those concepts exist on the platform (mig 0010 removed
//   trips; mig 0146 logs WhatsApp taps as heads-up only).
//
// Effect on visibility:
//   Listing queries on /cari, /r, /car sort `snoozed_until > now()`
//   drivers to the end of the randomised order. They are not hidden;
//   visitors can still discover them by scrolling. The 48h window is a
//   directory ranking signal, not a ban.
// ============================================================================

export const dynamic = 'force-dynamic'

const DEFAULT_SNOOZE_HOURS = 48
const MIN_HOURS = 1
const MAX_HOURS = 168 // 7 days — anything longer should be 'offline' availability

function isLocalHost(host: string | null): boolean {
  if (!host) return false
  const h = host.toLowerCase().split(':')[0]
  return h === 'localhost' || h === '127.0.0.1'
}

export async function PATCH(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const isProd = process.env.NODE_ENV === 'production'
  let actingUserId: string | null = null
  const { data: { user } } = await userClient.auth.getUser()
  if (user) {
    actingUserId = user.id
  } else if (!isProd && isLocalHost(req.headers.get('host'))) {
    const cookieStore = await cookies()
    const devUid = cookieStore.get('cr-dev-uid')?.value
    if (devUid) actingUserId = devUid
  }
  if (!actingUserId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { hours?: number; clear?: boolean }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  if (body.clear === true) {
    const { error } = await admin
      .from('drivers')
      .update({ snoozed_until: null })
      .eq('user_id', actingUserId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, snoozed_until: null })
  }

  let hours = body.hours ?? DEFAULT_SNOOZE_HOURS
  if (!Number.isFinite(hours)) hours = DEFAULT_SNOOZE_HOURS
  if (hours < MIN_HOURS) hours = MIN_HOURS
  if (hours > MAX_HOURS) hours = MAX_HOURS

  const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

  const { error } = await admin
    .from('drivers')
    .update({ snoozed_until: snoozedUntil })
    .eq('user_id', actingUserId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, snoozed_until: snoozedUntil, hours })
}

// GET — returns current snooze state for the acting driver. Used by the
// dashboard toggle to render the countdown without a refresh.
export async function GET(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const isProd = process.env.NODE_ENV === 'production'
  let actingUserId: string | null = null
  const { data: { user } } = await userClient.auth.getUser()
  if (user) {
    actingUserId = user.id
  } else if (!isProd && isLocalHost(req.headers.get('host'))) {
    const cookieStore = await cookies()
    const devUid = cookieStore.get('cr-dev-uid')?.value
    if (devUid) actingUserId = devUid
  }
  if (!actingUserId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data, error } = await admin
    .from('drivers')
    .select('snoozed_until')
    .eq('user_id', actingUserId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const snoozedUntil = (data?.snoozed_until as string | null) ?? null
  const isActive = snoozedUntil ? new Date(snoozedUntil).getTime() > Date.now() : false
  return NextResponse.json({
    snoozed_until: snoozedUntil,
    active: isActive,
  })
}
