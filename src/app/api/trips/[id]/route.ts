import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerSupabase } from '@/lib/supabase/server'
import { verifyTripToken } from '@/lib/trips/token'
import type { TripStatus, PaymentMethod, PaymentStatus } from '@/types/database'

// ============================================================================
// GET /api/trips/[id]
// ----------------------------------------------------------------------------
// Reads a trip. Two access paths:
//   1. Authenticated user (driver of the trip OR admin) — uses RLS
//   2. Anonymous customer with `?token=...` — token is HMAC of (id + phone),
//      issued by POST /api/trips
// ============================================================================
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || ''

  // First try the authenticated path (driver or admin)
  const userClient = await getServerSupabase()
  if (userClient) {
    const { data: trip } = await userClient.from('trips').select('*').eq('id', id).maybeSingle()
    if (trip) return NextResponse.json({ trip })
  }

  // Fall back to anonymous token path
  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }
  const { data: trip } = await admin.from('trips').select('*').eq('id', id).maybeSingle()
  if (!trip) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!verifyTripToken(id, trip.customer_phone, token)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ trip })
}

// ============================================================================
// PATCH /api/trips/[id]
// ----------------------------------------------------------------------------
// Driver progresses the trip through states.
// Customer can: cancel (before accepted), mark paid, rate.
// Each transition is gated to the rightful actor + valid prior state.
// ============================================================================

type PatchPayload = {
  action:
    | 'accept'
    | 'decline'
    | 'arrive'
    | 'start'
    | 'complete'
    | 'cancel'
    | 'mark_paid'
    | 'confirm_payment'
    | 'rate'
  cancel_reason?: string
  payment_method?: PaymentMethod
  rating?: number
  rating_comment?: string
  // Anonymous-customer access token (required for cancel/mark_paid/rate
  // when the customer isn't a Supabase Auth user)
  token?: string
}

// Allowed status transitions per actor.
const DRIVER_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  requested:    ['accepted', 'expired'],
  accepted:     ['arrived',  'canceled'],
  arrived:      ['in_progress', 'canceled'],
  in_progress:  ['completed', 'canceled'],
  completed:    [],
  canceled:     [],
  expired:      [],
}

const CUSTOMER_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  requested:    ['canceled'],
  accepted:     ['canceled'],
  arrived:      [],
  in_progress:  [],
  completed:    [],
  canceled:     [],
  expired:      [],
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }
  const { id } = await ctx.params

  let body: PatchPayload
  try {
    body = (await req.json()) as PatchPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Load the trip first so we can check the actor + current status
  const { data: trip, error: loadErr } = await admin
    .from('trips')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  // Figure out who's calling: authenticated driver, or anonymous customer with token
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }

  let actor: 'driver' | 'customer' | null = null
  let actorId: string | null = null
  if (user && user.id === trip.driver_id) {
    actor = 'driver'
    actorId = user.id
  } else if (user && user.id === trip.customer_user_id) {
    actor = 'customer'
    actorId = user.id
  } else if (verifyTripToken(id, trip.customer_phone, body.token || '')) {
    actor = 'customer'
  }

  if (!actor) {
    return NextResponse.json({ error: 'Not authorized for this trip' }, { status: 403 })
  }

  // Compute desired new status + extra column updates
  const now = new Date().toISOString()
  let newStatus: TripStatus | null = null
  const patch: Record<string, unknown> = {}
  const eventPayload: Record<string, unknown> = {}

  switch (body.action) {
    case 'accept':
      if (actor !== 'driver') return forbid()
      newStatus = 'accepted'
      patch.accepted_at = now
      break
    case 'decline':
      if (actor !== 'driver') return forbid()
      newStatus = 'expired'  // customer will see "rider declined" and pick another
      patch.cancel_reason = body.cancel_reason?.trim() || 'declined_by_rider'
      break
    case 'arrive':
      if (actor !== 'driver') return forbid()
      newStatus = 'arrived'
      break
    case 'start':
      if (actor !== 'driver') return forbid()
      newStatus = 'in_progress'
      break
    case 'complete':
      if (actor !== 'driver') return forbid()
      newStatus = 'completed'
      patch.completed_at = now
      if (body.payment_method) patch.payment_method = body.payment_method
      break
    case 'cancel':
      newStatus = 'canceled'
      patch.cancel_reason = body.cancel_reason?.trim() || `canceled_by_${actor}`
      break
    case 'mark_paid':
      if (actor !== 'customer') return forbid()
      patch.payment_status = 'pending'  // customer says "I paid"; rider confirms
      if (body.payment_method) patch.payment_method = body.payment_method
      eventPayload.payment_method = patch.payment_method ?? null
      break
    case 'confirm_payment':
      if (actor !== 'driver') return forbid()
      patch.payment_status = 'confirmed' satisfies PaymentStatus
      break
    case 'rate':
      if (actor !== 'customer') return forbid()
      if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
        return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
      }
      patch.rating = body.rating
      if (body.rating_comment) patch.rating_comment = body.rating_comment.trim()
      break
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  // Validate status transition is legal for this actor
  if (newStatus) {
    const legal = (actor === 'driver' ? DRIVER_TRANSITIONS : CUSTOMER_TRANSITIONS)[trip.status as TripStatus]
    if (!legal.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot move trip from ${trip.status} to ${newStatus}` },
        { status: 409 },
      )
    }
    patch.status = newStatus
  }

  const { error: updateErr } = await admin.from('trips').update(patch).eq('id', id)
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Append-only event log
  await admin.from('trip_events').insert({
    trip_id: id,
    actor_id: actorId,
    event_type: body.action,
    payload: {
      from_status: trip.status,
      to_status: newStatus,
      ...eventPayload,
      ...(body.cancel_reason ? { reason: body.cancel_reason } : {}),
      ...(body.rating ? { rating: body.rating } : {}),
    },
  })

  // Bump rider's cached rating + trips_count on completion / rating
  if (body.action === 'complete' || body.action === 'rate') {
    await refreshDriverStats(admin, trip.driver_id)
  }

  return NextResponse.json({ ok: true, status: newStatus ?? trip.status })
}

function forbid() {
  return NextResponse.json({ error: 'Forbidden for this actor' }, { status: 403 })
}

async function refreshDriverStats(admin: ReturnType<typeof getAdminSupabase>, driverId: string) {
  if (!admin) return
  const { data } = await admin
    .from('trips')
    .select('rating')
    .eq('driver_id', driverId)
    .eq('status', 'completed')
  if (!data) return
  const rated = data.filter((t: { rating: number | null }) => t.rating != null)
  const avg = rated.length
    ? Math.round((rated.reduce((s: number, t: { rating: number | null }) => s + (t.rating ?? 0), 0) / rated.length) * 10) / 10
    : null
  await admin
    .from('drivers')
    .update({ trips_count: data.length, rating: avg })
    .eq('user_id', driverId)
}
