import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/laundry/[slug]/book
// Customer submits a booking request for the laundry provider. Provider
// sees it in her dashboard bookings page and confirms / declines. Mirrors
// /api/beautician/[slug]/book — same JSON contract so ContactBookingPopup
// can target either vertical.
// Platform never holds money; the actual handshake continues on WhatsApp.

export const runtime = 'nodejs'

type Body = {
  customer_name?:     string
  customer_whatsapp?: string
  service_name?:      string
  requested_date?:    string  // YYYY-MM-DD
  requested_time?:    string  // HH:MM
  notes?:             string
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function hashIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const ip  = fwd.split(',')[0].trim() || 'unknown'
  return createHash('sha256').update(`bookip:${ip}`).digest('hex').slice(0, 32)
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = (body.customer_name || '').trim()
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
  }

  const wa = (body.customer_whatsapp || '').replace(/\s|-/g, '')
  if (!/^\+?\d{8,15}$/.test(wa)) {
    return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
  }

  const date = (body.requested_date || '').trim()
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
  }
  const dayMs    = 24 * 60 * 60 * 1000
  const requested = new Date(date + 'T00:00:00Z').getTime()
  if (!Number.isFinite(requested) || requested < Date.now() - dayMs) {
    return NextResponse.json({ error: 'date_in_past' }, { status: 400 })
  }

  const time = (body.requested_time || '').trim()
  if (!TIME_RE.test(time)) {
    return NextResponse.json({ error: 'invalid_time' }, { status: 400 })
  }

  const serviceName = (body.service_name || '').trim().slice(0, 80) || null
  const notes       = (body.notes || '').trim().slice(0, 300) || null

  // Look up the laundry_id by slug — only active providers accept
  // booking requests (pending/suspended/removed silently 404).
  const { data: lp, error: lpErr } = await admin
    .from('laundry_providers')
    .select('id, status')
    .eq('slug', slug)
    .maybeSingle()
  if (lpErr) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  if (!lp || lp.status !== 'active') return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const ipHash = hashIp(req)

  // Lightweight abuse cap — max 8 requests/day per submitter IP across
  // the whole platform.
  const since = new Date(Date.now() - dayMs).toISOString()
  const { count: recent } = await admin
    .from('laundry_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('submitter_ip_hash', ipHash)
    .gte('created_at', since)
  if ((recent ?? 0) >= 8) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const { data, error } = await admin
    .from('laundry_bookings')
    .insert({
      laundry_id:        lp.id,
      customer_name:     name,
      customer_whatsapp: wa,
      service_name:      serviceName,
      requested_date:    date,
      requested_time:    time,
      notes,
      submitter_ip_hash: ipHash,
    })
    .select('id, requested_date, requested_time')
    .single()

  if (error) {
    console.error('[laundry/book] insert failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, booking: data })
}
