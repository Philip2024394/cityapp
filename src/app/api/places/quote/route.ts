import { NextResponse } from 'next/server'
import { getPlaceBySlug } from '@/lib/places/queries'
import { quotePlace } from '@/lib/places/pricing'

// POST /api/places/quote
// Body: { placeSlug: string, fromLat: number, fromLng: number }
//
// Returns the authoritative quote for a pickup → place trip, including
// whether the destination falls outside the city zone (return fare
// included). Cards render their own client-side preview from the same
// pricing function for speed; this endpoint exists so the rest of the
// app (shared links, future "save trip", confirmation modals) can
// resolve a quote from just (slug, pickup) without trusting the client.
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const slug    = pickString(body, 'placeSlug')
  const fromLat = pickNumber(body, 'fromLat')
  const fromLng = pickNumber(body, 'fromLng')

  if (!slug)               return NextResponse.json({ error: 'missing_place_slug' }, { status: 400 })
  if (fromLat == null)     return NextResponse.json({ error: 'missing_from_lat'  }, { status: 400 })
  if (fromLng == null)     return NextResponse.json({ error: 'missing_from_lng'  }, { status: 400 })
  if (!isLat(fromLat))     return NextResponse.json({ error: 'invalid_from_lat'  }, { status: 400 })
  if (!isLng(fromLng))     return NextResponse.json({ error: 'invalid_from_lng'  }, { status: 400 })

  const hit = await getPlaceBySlug(slug)
  if (!hit) return NextResponse.json({ error: 'place_not_found' }, { status: 404 })

  const quote = quotePlace({ lat: fromLat, lng: fromLng }, hit.place)
  return NextResponse.json({
    place: {
      slug: hit.place.slug,
      name: hit.place.name,
      category: hit.place.category,
      lat:  hit.place.lat,
      lng:  hit.place.lng,
    },
    quote,
  })
}

function pickString(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== 'object') return null
  const v = (obj as Record<string, unknown>)[key]
  return typeof v === 'string' && v.length > 0 ? v : null
}

function pickNumber(obj: unknown, key: string): number | null {
  if (!obj || typeof obj !== 'object') return null
  const v = (obj as Record<string, unknown>)[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function isLat(n: number): boolean { return n >= -90  && n <= 90  }
function isLng(n: number): boolean { return n >= -180 && n <= 180 }
