import { NextResponse } from 'next/server'

// POST /api/quote
// Body: { riderId, pickup: {lat, lng, label?}, dropoff: {...}, distanceKm, estimatedFare, source }
// In production: insert quote_events row + trigger Web Push to rider's devices.
// For now: just echo back with a server timestamp — wiring Supabase comes in Phase 2.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    // TODO Phase 2: validate with zod, insert into Supabase, fire web-push
    return NextResponse.json({
      ok: true,
      receivedAt: new Date().toISOString(),
      echo: body,
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
}
