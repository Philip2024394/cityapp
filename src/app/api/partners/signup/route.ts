import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/partners/signup
// Creates a partners row owned by the calling user. Requires Supabase
// auth (previously this route was anon-callable — flagged by security
// audit as an outlier vs every other vertical's signup). New rows land
// at status='active' since the owner has already proven email control
// via the auth signup step.

export const runtime = 'nodejs'

type Body = {
  name?: string
  partner_type?: string
  contact_email?: string
  contact_phone?: string
  contact_whatsapp?: string
  address?: string
  city?: string
  lat?: number
  lng?: number
}

const ALLOWED_TYPES = ['hotel','villa','restaurant','cafe','spa','tour_operator','private_seller','other']

// Indonesia bounding box — broadly Sabang (NW Sumatra) to Merauke (E Papua).
// Lat   −11.5 → 6.5, Lng 94 → 142. Anything outside is either fat-fingered
// or someone trying to seed a fake venue offshore.
const ID_LAT_MIN = -11.5, ID_LAT_MAX = 6.5
const ID_LNG_MIN = 94,    ID_LNG_MAX = 142

const MAX_NAME_LEN    = 120
const MAX_ADDRESS_LEN = 250
const MAX_PHONE_LEN   = 32

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'partner'
}

function cleanPhone(input: string | undefined): string | null {
  if (!input) return null
  const v = input.replace(/\s|-/g, '').trim()
  if (!v) return null
  if (v.length > MAX_PHONE_LEN) return null
  // Permissive — accept E.164 (+62…) and local (08…) since onboarding form
  // doesn't enforce one canonical shape yet. Tighten later if needed.
  if (!/^\+?\d{8,15}$/.test(v)) return null
  return v
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  if (!userClient) return NextResponse.json({ error: 'server_not_configured' }, { status: 500 })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  const email = (body.contact_email || '').trim().toLowerCase()
  if (!name || name.length < 2 || name.length > MAX_NAME_LEN) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'valid_email_required' }, { status: 400 })
  }

  const partnerType = body.partner_type && ALLOWED_TYPES.includes(body.partner_type)
    ? body.partner_type
    : 'hotel'

  // Address bounded length + trimmed — no further validation. Free-form
  // text is the right call for venue addresses.
  const address = (body.address || '').trim().slice(0, MAX_ADDRESS_LEN) || null
  const city    = (body.city    || '').trim().slice(0, 80)              || null
  const phone   = cleanPhone(body.contact_phone)
  const wa      = cleanPhone(body.contact_whatsapp)

  // Lat/lng must fall inside the Indonesia bounding box if provided.
  // Either both set + valid, or both null. Rejects 0,0 (Gulf of Guinea),
  // London (51, 0), and other obvious bogus coords.
  let lat: number | null = null
  let lng: number | null = null
  if (typeof body.lat === 'number' && typeof body.lng === 'number') {
    if (!Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
      return NextResponse.json({ error: 'invalid_coords' }, { status: 400 })
    }
    if (body.lat < ID_LAT_MIN || body.lat > ID_LAT_MAX ||
        body.lng < ID_LNG_MIN || body.lng > ID_LNG_MAX) {
      return NextResponse.json({ error: 'coords_outside_indonesia' }, { status: 400 })
    }
    lat = body.lat
    lng = body.lng
  }

  // Generate a unique slug — append -2, -3 etc on collision.
  const base = slugify(name)
  let slug = base
  for (let i = 2; i <= 9; i++) {
    const { data: existing } = await admin
      .from('partners').select('id').eq('slug', slug).maybeSingle()
    if (!existing) break
    slug = `${base}-${i}`
    if (i === 9) return NextResponse.json({ error: 'slug_collision' }, { status: 409 })
  }

  const { data, error } = await admin.from('partners').insert({
    slug,
    name,
    partner_type: partnerType,
    contact_email: email,
    contact_phone: phone,
    contact_whatsapp: wa,
    address,
    city,
    lat,
    lng,
    owner_user_id: user.id,
    status: 'active',
  }).select('id, slug, status').single()

  if (error) {
    console.error('[partners/signup] insert failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, partner: data })
}
