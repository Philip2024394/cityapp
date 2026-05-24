import { NextResponse } from 'next/server'
import { assertAdminFromCookies, writeAudit } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/admin/providers — single mutation endpoint for the unified
// /admin/providers page. Body shape:
//   {
//     table: 'partners' | 'massage_providers' | 'tour_guide_listings'
//          | 'mock_drivers' | 'mock_bike_rentals' | 'mock_tour_guide_listings'
//          | 'partner_bookings',
//     id: string (uuid),
//     action: 'approve' | 'reject' | 'suspend' | 'activate'
//           | 'toggle_mock_visibility'
//           | 'settle' | 'dispute' | 'waive',
//     reason?: string
//   }
//
// Every action is wrapped in an audit_log entry so we can trace any
// admin change later. Service-role client is used after a profile
// role-check; never trust the cookie alone.

export const runtime = 'nodejs'

type Body = {
  table?: string
  id?: string
  action?: string
  reason?: string
}

type ProviderTable =
  | 'partners' | 'massage_providers' | 'tour_guide_listings'
  | 'mock_drivers' | 'mock_bike_rentals' | 'mock_tour_guide_listings'
  | 'partner_bookings'

const PROVIDER_TABLES = new Set<ProviderTable>([
  'partners','massage_providers','tour_guide_listings',
  'mock_drivers','mock_bike_rentals','mock_tour_guide_listings',
  'partner_bookings',
])

export async function POST(req: Request) {
  const admin = await assertAdminFromCookies()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = await req.json() as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const table = body.table as ProviderTable | undefined
  const id = body.id
  const action = body.action
  const reason = (body.reason || '').trim() || null

  if (!table || !PROVIDER_TABLES.has(table)) {
    return NextResponse.json({ error: 'invalid_table' }, { status: 400 })
  }
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id_required' }, { status: 400 })
  }

  const isMockTable = table.startsWith('mock_') ||
    (table === 'massage_providers' && action === 'toggle_mock_visibility')

  let update: Record<string, unknown> = {}
  let auditAction = `admin.${table}.${action}`

  switch (action) {
    case 'approve':
      if (table === 'tour_guide_listings') update = { status: 'approved' }
      else if (table === 'massage_providers') update = { status: 'active', verified_at: new Date().toISOString(), verified_by: admin.id }
      else if (table === 'partners') update = { status: 'active' }
      else return NextResponse.json({ error: 'invalid_action_for_table' }, { status: 400 })
      break
    case 'reject':
      // Status enum varies per table:
      //   tour_guide_listings → 'rejected' + rejection_note column
      //   partners            → 'removed'  (no rejected_reason column)
      //   massage_providers   → 'removed'  + rejected_reason column
      if (table === 'tour_guide_listings') update = { status: 'rejected', rejection_note: reason }
      else if (table === 'massage_providers') update = { status: 'removed', rejected_reason: reason }
      else if (table === 'partners') update = { status: 'removed' }
      else return NextResponse.json({ error: 'invalid_action_for_table' }, { status: 400 })
      break
    case 'suspend':
      update = { status: 'suspended' }
      break
    case 'activate':
      if (table === 'partners') update = { status: 'active' }
      else if (table === 'massage_providers') update = { status: 'active' }
      else if (table === 'tour_guide_listings') update = { status: 'approved' }
      else return NextResponse.json({ error: 'invalid_action_for_table' }, { status: 400 })
      break

    case 'toggle_mock_visibility': {
      if (!isMockTable) {
        return NextResponse.json({ error: 'not_a_mock_table' }, { status: 400 })
      }
      // Read current state, flip it.
      const { data: cur, error } = await supabase
        .from(table)
        .select('mock_hidden_at')
        .eq('id', id)
        .maybeSingle()
      if (error || !cur) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
      update = { mock_hidden_at: cur.mock_hidden_at ? null : new Date().toISOString() }
      break
    }

    case 'settle':
      if (table !== 'partner_bookings') return NextResponse.json({ error: 'invalid_action_for_table' }, { status: 400 })
      update = { status: 'settled', settled_at: new Date().toISOString(), settled_by: admin.id }
      break
    case 'dispute':
      if (table !== 'partner_bookings') return NextResponse.json({ error: 'invalid_action_for_table' }, { status: 400 })
      update = { status: 'disputed', dispute_reason: reason }
      break
    case 'waive':
      if (table !== 'partner_bookings') return NextResponse.json({ error: 'invalid_action_for_table' }, { status: 400 })
      update = { status: 'waived' }
      break

    default:
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  }

  const { data: before } = await supabase.from(table).select('*').eq('id', id).maybeSingle()
  const { error: updErr } = await supabase.from(table).update(update).eq('id', id)
  if (updErr) {
    console.error('[admin/providers] update failed', { table, id, action, message: updErr.message })
    return NextResponse.json({ error: 'update_failed', detail: updErr.message }, { status: 500 })
  }

  await writeAudit({
    actorId: admin.id,
    action: auditAction,
    entityType: table,
    entityId: id,
    before: before as Record<string, unknown> | null,
    after: update,
  })

  return NextResponse.json({ ok: true })
}
