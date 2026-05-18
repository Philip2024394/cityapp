import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { signTripToken } from '@/lib/trips/token'
import type { ServiceType, PaymentMethod } from '@/types/database'

// ============================================================================
// POST /api/trips
// ----------------------------------------------------------------------------
// Customer creates a trip pointed at a specific independent rider.
//
// Rules baked in:
//   * driver_id is REQUIRED — there is no auto-assignment path
//   * The chosen rider must be active + 'online' availability + not on
//     another active trip (otherwise we'd queue a stale request)
//   * Anonymous customers are allowed (most customers won't sign up).
//     We return a short token the customer's browser stores so they can
//     read their own trip later via GET /api/trips/[id]?token=...
// ============================================================================

const ALLOWED_SERVICES: ServiceType[] = ['person', 'parcel', 'food']
const ALLOWED_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'qr', 'transfer']

type CreatePayload = {
  driver_id: string
  customer_phone: string
  customer_name?: string
  service: ServiceType
  pickup_lat: number
  pickup_lng: number
  pickup_label?: string
  dropoff_lat: number
  dropoff_lng: number
  dropoff_label?: string
  pitstop_note?: string
  distance_km?: number
  estimated_fare?: number
  payment_method?: PaymentMethod
}

function normalizePhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('62')) return digits
  return null
}

export async function POST(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  let body: CreatePayload
  try {
    body = (await req.json()) as CreatePayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.driver_id || typeof body.driver_id !== 'string') {
    return NextResponse.json(
      { error: 'driver_id is required — customers must pick a rider manually' },
      { status: 400 },
    )
  }
  const phone = normalizePhone(body.customer_phone)
  if (!phone) {
    return NextResponse.json({ error: 'Valid Indonesian phone number required' }, { status: 400 })
  }
  if (!ALLOWED_SERVICES.includes(body.service)) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
  }
  if (
    typeof body.pickup_lat !== 'number' || typeof body.pickup_lng !== 'number' ||
    typeof body.dropoff_lat !== 'number' || typeof body.dropoff_lng !== 'number'
  ) {
    return NextResponse.json({ error: 'Pickup + dropoff coordinates required' }, { status: 400 })
  }
  if (body.payment_method && !ALLOWED_PAYMENT_METHODS.includes(body.payment_method)) {
    return NextResponse.json({ error: 'Invalid payment_method' }, { status: 400 })
  }

  // Verify the chosen rider is currently bookable.
  // We DO NOT auto-fallback to another rider — customer must pick manually.
  const { data: driver, error: driverErr } = await admin
    .from('drivers')
    .select('user_id, business_name, status, availability, services')
    .eq('user_id', body.driver_id)
    .maybeSingle()
  if (driverErr) {
    return NextResponse.json({ error: 'Could not verify rider' }, { status: 500 })
  }
  if (!driver) {
    return NextResponse.json({ error: 'Rider not found' }, { status: 404 })
  }
  if (driver.status !== 'active') {
    return NextResponse.json({ error: `Rider is currently ${driver.status}` }, { status: 409 })
  }
  if (driver.availability !== 'online') {
    return NextResponse.json(
      { error: 'Rider is not currently online — please pick another rider', availability: driver.availability },
      { status: 409 },
    )
  }
  if (!driver.services.includes(body.service)) {
    return NextResponse.json({ error: 'Rider does not offer this service' }, { status: 409 })
  }

  // Insert. The unique partial index trips_one_active_per_driver_idx
  // physically prevents double-booking — if the rider already has an active
  // trip, this insert FAILS at the DB level. We surface that as a 409.
  const insert = await admin
    .from('trips')
    .insert({
      driver_id: body.driver_id,
      customer_phone: phone,
      customer_name: body.customer_name?.trim() || null,
      service: body.service,
      status: 'requested',
      pickup_lat: body.pickup_lat,
      pickup_lng: body.pickup_lng,
      pickup_label: body.pickup_label?.trim() || null,
      dropoff_lat: body.dropoff_lat,
      dropoff_lng: body.dropoff_lng,
      dropoff_label: body.dropoff_label?.trim() || null,
      pitstop_note: body.pitstop_note?.trim() || null,
      distance_km: body.distance_km ?? null,
      estimated_fare: body.estimated_fare != null ? Math.round(body.estimated_fare) : null,
      payment_method: body.payment_method ?? null,
    })
    .select('id')
    .single()

  if (insert.error) {
    if (insert.error.code === '23505') {
      return NextResponse.json(
        { error: 'Rider just accepted another booking — please pick another' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: insert.error.message }, { status: 500 })
  }

  const tripId = insert.data!.id as string

  await admin.from('trip_events').insert({
    trip_id: tripId,
    event_type: 'created',
    payload: { customer_phone: phone, source: 'customer_picked_manually' },
  })

  const token = signTripToken(tripId, phone)
  return NextResponse.json(
    { trip_id: tripId, token, driver_name: driver.business_name },
    { status: 201 },
  )
}
