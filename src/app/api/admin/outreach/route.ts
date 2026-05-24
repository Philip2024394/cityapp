import { NextResponse } from 'next/server'
import { assertAdminFromCookies } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'

// Outreach CRM — admin-only.
//   GET    /api/admin/outreach            → list (optional ?status, ?category, ?city)
//   POST   /api/admin/outreach            → create (single contact)
//   POST   /api/admin/outreach { bulk: [] } → create many
//   PATCH  /api/admin/outreach { id, ...patch } → update
//   DELETE /api/admin/outreach?id=...     → soft remove (set status='passed')

export const runtime = 'nodejs'

const ALLOWED_CATEGORY = new Set([
  'bike_rental','driver','massage','tour_guide','partner_venue','food_vendor','other',
])
const ALLOWED_STATUS = new Set([
  'queued','contacted','replied','meeting','converted','passed','no_reply',
])

export async function GET(req: Request) {
  const admin = await assertAdminFromCookies()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  let q = supabase.from('outreach_contacts').select('*').order('updated_at', { ascending: false }).limit(500)
  const st = searchParams.get('status'); if (st && ALLOWED_STATUS.has(st)) q = q.eq('status', st)
  const ct = searchParams.get('category'); if (ct && ALLOWED_CATEGORY.has(ct)) q = q.eq('category', ct)
  const city = searchParams.get('city'); if (city) q = q.ilike('city', `%${city}%`)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'fetch_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data ?? [] })
}

type CreateRow = {
  business_name?: string
  category?: string
  city?: string
  whatsapp_e164?: string
  email?: string
  website?: string
  notes?: string
  source?: string
}

export async function POST(req: Request) {
  const admin = await assertAdminFromCookies()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { bulk?: CreateRow[] } & CreateRow
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const inputs = Array.isArray(body.bulk) ? body.bulk : [body]
  const rows = inputs
    .map((r) => normalise(r, admin.id))
    .filter((r): r is NonNullable<ReturnType<typeof normalise>> => r !== null)
  if (rows.length === 0) return NextResponse.json({ error: 'no_valid_rows' }, { status: 400 })

  const { error, count } = await supabase.from('outreach_contacts').insert(rows, { count: 'exact' })
  if (error) return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, inserted: count ?? rows.length })
}

function normalise(r: CreateRow, ownerId: string) {
  const name = (r.business_name || '').trim()
  const category = (r.category || '').trim()
  if (!name) return null
  if (!ALLOWED_CATEGORY.has(category)) return null
  return {
    business_name: name,
    category,
    city:          (r.city || '').trim() || null,
    whatsapp_e164: (r.whatsapp_e164 || '').trim() || null,
    email:         (r.email || '').trim() || null,
    website:       (r.website || '').trim() || null,
    notes:         (r.notes || '').trim() || null,
    source:        (r.source || '').trim() || null,
    owner_user_id: ownerId,
  }
}

export async function PATCH(req: Request) {
  const admin = await assertAdminFromCookies()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: { id?: string; status?: string; notes?: string; touch?: boolean }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'id_required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (body.status && ALLOWED_STATUS.has(body.status)) {
    update.status = body.status
    if (body.status === 'contacted') update.contacted_at = new Date().toISOString()
    if (body.status === 'converted') update.converted_at = new Date().toISOString()
  }
  if (typeof body.notes === 'string') update.notes = body.notes
  if (body.touch) {
    update.last_touch_at = new Date().toISOString()
    // raw count increment via select-then-update; cheap because the row is tiny
    const { data: cur } = await supabase
      .from('outreach_contacts').select('touch_count').eq('id', body.id).maybeSingle()
    update.touch_count = ((cur?.touch_count as number | undefined) ?? 0) + 1
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }

  const { error } = await supabase.from('outreach_contacts').update(update).eq('id', body.id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const admin = await assertAdminFromCookies()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const supabase = getAdminSupabase()
  if (!supabase) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 })

  const { error } = await supabase.from('outreach_contacts').update({ status: 'passed' }).eq('id', id)
  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
