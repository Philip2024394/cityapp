import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

// ============================================================================
// POST /api/driver-rides-log
// ----------------------------------------------------------------------------
// Driver-self-entered ride log row. Owner-scoped — only the driver
// themselves can write to their log. RLS (migration 0014) enforces
// auth.uid() = driver_user_id at the DB level; this route also gates
// the auth check up-front for a friendlier error message.
//
// NOT a trip dispatch endpoint. The platform never auto-inserts into
// this table. It exists purely so drivers have a bookkeeping log
// they can use for tax / insurance / police records.
// ============================================================================

const FIELDS = [
  'ride_date',
  'pickup_label',
  'dropoff_label',
  'pitstop_note',
  'customer_name',
  'customer_phone',
  'service',
  'distance_km',
  'amount_idr',
  'notes',
] as const

type Field = (typeof FIELDS)[number]

function buildRow(body: Record<string, unknown>): Partial<Record<Field, unknown>> {
  const row: Partial<Record<Field, unknown>> = {}
  for (const key of FIELDS) {
    if (key in body) row[key] = body[key]
  }
  return row
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // Confirm a drivers row exists — anonymous customers can't keep a log.
  const { data: driver } = await supabase
    .from('drivers')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!driver) {
    return NextResponse.json({ error: 'Complete onboarding first' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try { body = (await req.json()) as Record<string, unknown> }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const row = buildRow(body)
  // RLS enforces driver_user_id = auth.uid(); pass it explicitly so
  // the INSERT doesn't fall back to NULL.
  ;(row as Record<string, unknown>).driver_user_id = user.id

  const { data, error } = await supabase
    .from('driver_rides_log')
    .insert(row)
    .select('id, ride_date, amount_idr, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ...data }, { status: 201 })
}
