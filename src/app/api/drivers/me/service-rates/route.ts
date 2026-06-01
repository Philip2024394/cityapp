import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// /api/drivers/me/service-rates
// ----------------------------------------------------------------------------
// Driver-self-published rate-override storage for truck + minibus drivers.
// Backs the `/dashboard/{truck,bus}/rates` editor. Persists to the
// `drivers.service_rates` jsonb column (migration 0169).
//
// Body shape (POST):
//   { service_rates: { [service_id]: { rates: { label, idr, per? }[] } } }
//
//   - service_id is one of TRUCK_SERVICE_OFFERINGS / BUS_SERVICE_OFFERINGS ids.
//   - Empty / missing service_id → public profile falls back to catalog
//     `default_rates`. The editor "Reset to default" button simply omits the
//     id from the body (or passes an empty rates[]).
//
// GET — returns the current driver's `service_rates` for hydration.
//
// COMPLIANCE: CityDrivers is a software directory under PM 12/2019. The
// platform never sets, computes, modifies, or appoints these rates — every
// value here is driver-self-published.
// ============================================================================

type RateRow = { label: string; idr: number; per?: string }
type ServiceRates = Record<string, { rates: RateRow[] }>

// -----------------------------------------------------------------------------
// Sanitiser — defensive normalisation of the inbound jsonb shape. Drops any
// malformed entries silently so the worst a bad client can do is fail to
// persist an override (the public profile will just fall back to defaults).
// -----------------------------------------------------------------------------
function sanitizeServiceRates(raw: unknown): ServiceRates {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: ServiceRates = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== 'string' || !key.trim()) continue
    if (!val || typeof val !== 'object') continue
    const ratesRaw = (val as { rates?: unknown }).rates
    if (!Array.isArray(ratesRaw)) continue
    const rates: RateRow[] = []
    for (const r of ratesRaw) {
      if (!r || typeof r !== 'object') continue
      const row = r as { label?: unknown; idr?: unknown; per?: unknown }
      const label = typeof row.label === 'string' ? row.label.trim() : ''
      const idr   = typeof row.idr === 'number' && Number.isFinite(row.idr) ? Math.round(row.idr) : NaN
      if (!label || !Number.isFinite(idr) || idr <= 0) continue
      const per = typeof row.per === 'string' && row.per.trim() ? row.per.trim() : undefined
      rates.push(per ? { label, idr, per } : { label, idr })
    }
    if (rates.length > 0) out[key] = { rates }
  }
  return out
}

// -----------------------------------------------------------------------------
// GET — hydrate the dashboard editor with the current overrides.
// -----------------------------------------------------------------------------
export async function GET() {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  const { data, error } = await admin
    .from('drivers')
    .select('service_rates')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const raw = (data as { service_rates?: unknown } | null)?.service_rates
  return NextResponse.json({ service_rates: sanitizeServiceRates(raw) })
}

// -----------------------------------------------------------------------------
// POST — replace the driver's service_rates jsonb with the sanitised body.
// The endpoint is REPLACE-semantics (not merge): the editor always sends the
// full map so the driver's "Reset to default" by row-removal works.
// -----------------------------------------------------------------------------
export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { service_rates?: unknown }
  try { body = await req.json() as { service_rates?: unknown } }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body || typeof body !== 'object' || !('service_rates' in body)) {
    return NextResponse.json({ error: 'Missing service_rates' }, { status: 400 })
  }

  const sanitized = sanitizeServiceRates(body.service_rates)

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  // Casting through `unknown` because the generated Database types may not
  // yet include the post-0169 `service_rates` column. The runtime payload is
  // a plain Postgres jsonb write.
  const update = { service_rates: sanitized } as unknown as Record<string, unknown>
  const { error } = await admin
    .from('drivers')
    .update(update)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, service_rates: sanitized })
}
