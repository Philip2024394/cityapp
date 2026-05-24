import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// POST /api/partners/signup
// Creates a partners row owned by the calling user. The user must be
// authenticated (Supabase Auth via the regular driver/customer signup
// flow). Submits without auth fall through to status='pending' so an
// admin can review and claim manually later.

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

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'partner'
}

export async function POST(req: Request) {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  // Try to read an authenticated session — supports both signed-in
  // (auto-active) and anonymous (pending review) signup paths.
  let userId: string | null = null
  try {
    const userClient = await getServerSupabase()
    if (userClient) {
      const { data: { user } } = await userClient.auth.getUser()
      userId = user?.id ?? null
    }
  } catch { /* anonymous submit ok */ }

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  const email = (body.contact_email || '').trim().toLowerCase()
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'valid_email_required' }, { status: 400 })
  }

  const partnerType = body.partner_type && ALLOWED_TYPES.includes(body.partner_type)
    ? body.partner_type
    : 'hotel'

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
    contact_phone: body.contact_phone ?? null,
    contact_whatsapp: body.contact_whatsapp ?? null,
    address: body.address ?? null,
    city: body.city ?? null,
    lat: typeof body.lat === 'number' ? body.lat : null,
    lng: typeof body.lng === 'number' ? body.lng : null,
    owner_user_id: userId,
    status: userId ? 'active' : 'pending',
  }).select('id, slug, status').single()

  if (error) {
    console.error('[partners/signup] insert failed', { code: error.code, message: error.message, details: error.details })
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, partner: data })
}
