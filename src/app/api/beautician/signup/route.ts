import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { slugify } from '@/lib/beautician/slug'
import { isAllowedImageUrl, isValidKtpRef } from '@/lib/validation/images'

// POST /api/beautician/signup
// Creates a beautician_providers row owned by the authenticated user.
// status='pending' until admin verifies the KTP image.

export const runtime = 'nodejs'

type Body = {
  display_name?: string
  /** mig 0080 — studio/salon brand name (separate from display_name).
   *  Appears as the banner title on the public profile. */
  business_name?: string
  bio?: string
  price_makeup_idr?: number | null
  price_nail_idr?:   number | null
  price_hair_idr?:   number | null
  whatsapp_e164?: string
  city?: string
  service_area_notes?: string
  profile_image_url?: string
  ktp_image_url?: string
  /** mig 0079 — Visit Us opt-in driven by signup's "Service type"
   *  picker (business or both → true; mobile-only → false). */
  has_physical_location?: boolean
  /** mig 0073 — services the beautician offers. Populated at signup
   *  from the 8-tile main-services picker. */
  services_offered?: string[]
  /** mig 0077 — primary marketplace filter groups (max 3). */
  marketplace_categories?: string[]
}

const SERVICE_ALLOWLIST = new Set([
  'makeup','nails','hair','skin','lashes','brows',
  'waxing','facial','massage','henna','bridal','spa',
  'whitening','microblading','smoothing','permanent_makeup',
])

function numOrNull(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : null
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = await req.json() as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = (body.display_name || '').trim()
  const bio  = (body.bio          || '').trim()
  const wa   = (body.whatsapp_e164 || '').trim()

  if (!name || name.length < 2)               return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (!bio)                                   return NextResponse.json({ error: 'bio_required' }, { status: 400 })
  if (bio.length > 300)                       return NextResponse.json({ error: 'bio_too_long' }, { status: 400 })
  if (!wa || !/^\+?\d{8,15}$/.test(wa.replace(/\s|-/g, ''))) {
    return NextResponse.json({ error: 'whatsapp_required' }, { status: 400 })
  }

  const pMakeup = numOrNull(body.price_makeup_idr)
  const pNail   = numOrNull(body.price_nail_idr)
  const pHair   = numOrNull(body.price_hair_idr)
  if (pMakeup === null && pNail === null && pHair === null) {
    return NextResponse.json({ error: 'at_least_one_service' }, { status: 400 })
  }

  if (body.profile_image_url && !isAllowedImageUrl(body.profile_image_url)) {
    return NextResponse.json({ error: 'invalid_image_url' }, { status: 400 })
  }
  if (body.ktp_image_url && !isValidKtpRef(body.ktp_image_url, user.id)) {
    return NextResponse.json({ error: 'invalid_ktp' }, { status: 400 })
  }

  const base = slugify(name)
  let slug = base
  for (let i = 2; i <= 9; i++) {
    const { data: existing } = await admin
      .from('beautician_providers').select('id').eq('slug', slug).maybeSingle()
    if (!existing) break
    slug = `${base}-${i}`
    if (i === 9) return NextResponse.json({ error: 'slug_collision' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('beautician_providers')
    .insert({
      user_id: user.id,
      slug,
      display_name: name,
      business_name: (body.business_name || '').trim() || null,
      // gender + years_experience kept for legacy NOT NULL DB columns;
      // no longer collected from the user — defaults preserve insert
      // validity until a migration drops or relaxes the constraints.
      gender: 'woman',
      years_experience: 0,
      bio,
      price_makeup_idr: pMakeup,
      price_nail_idr:   pNail,
      price_hair_idr:   pHair,
      whatsapp_e164: wa.replace(/\s|-/g, ''),
      city:               (body.city || '').trim() || null,
      service_area_notes: (body.service_area_notes || '').trim() || null,
      profile_image_url:  (body.profile_image_url || '').trim() || null,
      ktp_image_url:      (body.ktp_image_url || '').trim() || null,
      // mig 0079 — Visit Us opt-in from signup's service-type picker.
      has_physical_location: body.has_physical_location === true,
      // mig 0073 — services unlocked at signup from the 8-tile picker.
      services_offered: Array.isArray(body.services_offered)
        ? body.services_offered
            .filter((s): s is string => typeof s === 'string' && SERVICE_ALLOWLIST.has(s))
            .slice(0, 16)
        : [],
      // mig 0077 — same picker drives the marketplace_categories.
      marketplace_categories: Array.isArray(body.marketplace_categories)
        ? body.marketplace_categories
            .filter((s): s is string => typeof s === 'string' && SERVICE_ALLOWLIST.has(s))
            .slice(0, 3)
        : [],
      availability: 'offline',
      status: 'pending',
    })
    .select('id, slug, status')
    .single()

  if (error) {
    console.error('[beautician/signup] insert failed', { code: error.code, message: error.message })
    if (error.code === '23505') return NextResponse.json({ error: 'already_registered' }, { status: 409 })
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, provider: data })
}
