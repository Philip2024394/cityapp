import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

// ============================================================================
// PUT /api/driver-renewals
// ----------------------------------------------------------------------------
// Owner-scoped upsert of the driver's renewal calendar. Single row
// per driver — caller sends the full set of dates each save. Any
// field omitted from the body is left untouched (PATCH-like merge
// at the column level).
//
// RLS (migration 0015) gates the row at auth.uid() = driver_user_id.
// ============================================================================

const FIELDS = [
  'sim_c_expires_on',
  'stnk_expires_on',
  'pkb_due_on',
  'bpjs_kes_paid_until',
  'bpjs_tk_paid_until',
  'pramuwisata_expires_on',
] as const

type Field = (typeof FIELDS)[number]

// Accept either an ISO date string ('2026-12-31') or null (clear the field).
function normaliseDate(v: unknown): string | null | undefined {
  if (v === undefined) return undefined  // not provided
  if (v === null || v === '') return null
  if (typeof v !== 'string') return undefined
  // Loose ISO date check; Postgres will reject anything truly invalid
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined
  return v
}

export async function PUT(req: Request) {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // Driver row must exist
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

  const payload: Record<string, string | null> = {}
  for (const f of FIELDS) {
    if (f in body) {
      const v = normaliseDate(body[f])
      if (v !== undefined) payload[f] = v
    }
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'No valid date fields supplied' }, { status: 400 })
  }

  // Upsert keyed on driver_user_id
  const { data, error } = await supabase
    .from('driver_renewals')
    .upsert({ driver_user_id: user.id, ...payload }, { onConflict: 'driver_user_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, row: data })
}

// Convenience GET so the client can load the existing row without a
// separate Supabase query.
export async function GET() {
  const supabase = await getServerSupabase()
  if (!supabase) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data, error } = await supabase
    .from('driver_renewals')
    .select('*')
    .eq('driver_user_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ row: data ?? null })
}
