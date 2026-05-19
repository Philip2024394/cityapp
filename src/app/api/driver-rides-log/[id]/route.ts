import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

// ============================================================================
// PATCH + DELETE /api/driver-rides-log/[id]
// ----------------------------------------------------------------------------
// Owner-scoped edit / delete of a logbook row. RLS gates the actual
// write to auth.uid() = driver_user_id, so if a driver tries to
// modify someone else's row they get a clean 404 (no row matched).
// ============================================================================

const EDITABLE = [
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

type Editable = (typeof EDITABLE)[number]

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = (await req.json()) as Record<string, unknown> }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const patch: Partial<Record<Editable, unknown>> = {}
  for (const key of EDITABLE) {
    if (key in body) patch[key] = body[key]
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('driver_rides_log')
    .update(patch)
    .eq('id', id)
    .select('id, updated_at')
    .maybeSingle()

  if (error)  return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 })
  return NextResponse.json({ ok: true, ...data })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await ctx.params
  const { error, count } = await supabase
    .from('driver_rides_log')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'Not found or not yours' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
