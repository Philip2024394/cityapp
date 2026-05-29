import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// PATCH /api/beautician/me/busy-time-slots
// Owner blocks a partial-day time range on their own calendar (mig 0134).
// Whole-day busy still lives in /busy-dates; this endpoint manages the
// time-range subset so a "Saturday 2-5pm wedding" doesn't lose the rest
// of Saturday.
//
// Body shape — three mutually-exclusive operations:
//   { add:    { date, start_time, end_time } }
//   { remove: { date, start_time, end_time } }
//   { slots:  [{ date, start_time, end_time }, ...] }  // replace all
//
// All values must match YYYY-MM-DD + HH:MM. end_time must be strictly
// later than start_time on the same date. Max 50 slots per provider
// (a year of weekly recurring busy is well under this).

export const runtime = 'nodejs'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

type Slot = { date: string; start_time: string; end_time: string }

function isSlot(v: unknown): v is Slot {
  if (!v || typeof v !== 'object') return false
  const o = v as Partial<Slot>
  if (typeof o.date !== 'string' || !DATE_RE.test(o.date)) return false
  if (typeof o.start_time !== 'string' || !TIME_RE.test(o.start_time)) return false
  if (typeof o.end_time !== 'string'   || !TIME_RE.test(o.end_time))   return false
  if (o.end_time <= o.start_time) return false
  return true
}

function slotKey(s: Slot): string {
  return `${s.date}|${s.start_time}|${s.end_time}`
}

export async function PATCH(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { add?: unknown; remove?: unknown; slots?: unknown[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { data: bp } = await admin
    .from('beautician_providers')
    .select('id, busy_time_slots')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!bp) return NextResponse.json({ error: 'no_provider' }, { status: 404 })

  const current: Slot[] = Array.isArray(bp.busy_time_slots)
    ? bp.busy_time_slots.filter(isSlot)
    : []

  let next: Slot[] = current

  if (body.slots !== undefined) {
    if (!Array.isArray(body.slots)) {
      return NextResponse.json({ error: 'invalid_slots' }, { status: 400 })
    }
    if (body.slots.length > 50) {
      return NextResponse.json({ error: 'too_many_slots' }, { status: 400 })
    }
    const seen = new Set<string>()
    const cleaned: Slot[] = []
    for (const s of body.slots) {
      if (!isSlot(s)) return NextResponse.json({ error: 'invalid_slot_in_array' }, { status: 400 })
      const k = slotKey(s)
      if (seen.has(k)) continue
      seen.add(k)
      cleaned.push(s)
    }
    next = cleaned.sort((a, b) => slotKey(a).localeCompare(slotKey(b)))
  } else if (body.add !== undefined) {
    if (!isSlot(body.add)) return NextResponse.json({ error: 'invalid_slot' }, { status: 400 })
    const k = slotKey(body.add)
    if (current.some((s) => slotKey(s) === k)) {
      next = current
    } else {
      if (current.length >= 50) {
        return NextResponse.json({ error: 'too_many_slots' }, { status: 400 })
      }
      next = [...current, body.add].sort((a, b) => slotKey(a).localeCompare(slotKey(b)))
    }
  } else if (body.remove !== undefined) {
    if (!isSlot(body.remove)) return NextResponse.json({ error: 'invalid_slot' }, { status: 400 })
    const k = slotKey(body.remove)
    next = current.filter((s) => slotKey(s) !== k)
  } else {
    return NextResponse.json({ error: 'no_op' }, { status: 400 })
  }

  const { error } = await admin
    .from('beautician_providers')
    .update({ busy_time_slots: next })
    .eq('id', bp.id)
  if (error) {
    console.error('[me/busy-time-slots] update failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, busy_time_slots: next })
}
