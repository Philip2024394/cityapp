import { NextResponse } from 'next/server'

// POST /api/rent/[slug]/book
// ----------------------------------------------------------------------------
// Stub booking endpoint for the rent vertical. The /rent/[slug] profile
// page mirrors the beautician/[slug] layout 1:1, including the
// ContactBookingPopup which POSTs to this endpoint before opening
// WhatsApp. The rent vertical doesn't yet have a `bike_rental_bookings`
// table; this stub validates the input shape and returns { ok: true }
// so the WhatsApp handoff fires. Booking persistence is a follow-up task
// (parallel to `beautician_bookings`).
//
// Validation mirrors /api/beautician/[slug]/book to keep client-side
// error handling identical across verticals.

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

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 })
  }

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

  // Persistence stub: no bike_rental_bookings table yet. Return ok so
  // the ContactBookingPopup proceeds to the WhatsApp handoff. Once the
  // table is added, insert the row here (mirrors beautician_bookings).
  return NextResponse.json({ ok: true })
}
