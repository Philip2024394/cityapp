import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { slugify } from '@/lib/laundry/slug'
import { isAllowedImageUrl, isValidKtpRef } from '@/lib/validation/images'

export const runtime = 'nodejs'

type Body = {
  display_name?: string
  years_experience?: number
  bio?: string
  price_wash_per_kg_idr?:      number | null
  price_wash_dry_per_kg_idr?:  number | null
  price_wash_iron_per_kg_idr?: number | null
  min_kg?: number | null
  turnaround_hours?: number | null
  whatsapp_e164?: string
  city?: string
  service_area_notes?: string
  profile_image_url?: string
  ktp_image_url?: string
}

function priceOrNull(v: number | null | undefined): number | null {
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
  if (!name || name.length < 2) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (!bio)                     return NextResponse.json({ error: 'bio_required' }, { status: 400 })
  if (bio.length > 300)         return NextResponse.json({ error: 'bio_too_long' }, { status: 400 })
  if (!wa || !/^\+?\d{8,15}$/.test(wa.replace(/\s|-/g, ''))) {
    return NextResponse.json({ error: 'whatsapp_required' }, { status: 400 })
  }
  const yrs = Number(body.years_experience ?? 0)
  if (!Number.isFinite(yrs) || yrs < 0 || yrs > 60) {
    return NextResponse.json({ error: 'invalid_years' }, { status: 400 })
  }

  const pW   = priceOrNull(body.price_wash_per_kg_idr)
  const pWD  = priceOrNull(body.price_wash_dry_per_kg_idr)
  const pWI  = priceOrNull(body.price_wash_iron_per_kg_idr)
  if (pW === null && pWD === null && pWI === null) {
    return NextResponse.json({ error: 'at_least_one_package' }, { status: 400 })
  }

  const minKg = (body.min_kg !== null && body.min_kg !== undefined && Number.isFinite(body.min_kg) && body.min_kg >= 0) ? body.min_kg : null
  const turn  = (body.turnaround_hours !== null && body.turnaround_hours !== undefined && Number.isFinite(body.turnaround_hours) && body.turnaround_hours > 0 && body.turnaround_hours <= 168) ? Math.round(body.turnaround_hours) : null

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
      .from('laundry_providers').select('id').eq('slug', slug).maybeSingle()
    if (!existing) break
    slug = `${base}-${i}`
    if (i === 9) return NextResponse.json({ error: 'slug_collision' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('laundry_providers')
    .insert({
      user_id: user.id,
      slug,
      display_name: name,
      years_experience: yrs,
      bio,
      price_wash_per_kg_idr:      pW,
      price_wash_dry_per_kg_idr:  pWD,
      price_wash_iron_per_kg_idr: pWI,
      min_kg: minKg,
      turnaround_hours: turn,
      whatsapp_e164: wa.replace(/\s|-/g, ''),
      city:               (body.city || '').trim() || null,
      service_area_notes: (body.service_area_notes || '').trim() || null,
      profile_image_url:  (body.profile_image_url || '').trim() || null,
      ktp_image_url:      (body.ktp_image_url || '').trim() || null,
      availability: 'offline',
      status: 'pending',
    })
    .select('id, slug, status')
    .single()

  if (error) {
    console.error('[laundry/signup] insert failed', { code: error.code, message: error.message })
    if (error.code === '23505') return NextResponse.json({ error: 'already_registered' }, { status: 409 })
    return NextResponse.json({ error: 'insert_failed', detail: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, provider: data })
}
