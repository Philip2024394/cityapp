import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isAllowedImageUrl } from '@/lib/validation/images'
import { validateUniversalProfile } from '@/lib/validation/universalProfile'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'
import type { Json } from '@/types/supabase'

// POST /api/facial/me/profile
// Owner-only update of editable facial-profile fields. Mirrors the
// massage + handyman + laundry + home-clean profile routes so the
// shared UniversalProfileExtrasEditor (mig 0072) + the existing
// hero/banner/promo/FAQ/legal client surfaces all save through one
// validator. NEVER touches status, verified_*, subscription_*, slug,
// user_id — those are admin-controlled or set at signup.

export const runtime = 'nodejs'

const ALLOWED_HERO_EFFECTS = new Set(['none','shimmer','dance','underline'])

type Body = {
  display_name?: string
  gender?: string
  years_experience?: number
  bio?: string
  price_60min_idr?: number | null
  price_90min_idr?: number | null
  price_120min_idr?: number | null
  whatsapp_e164?: string
  city?: string
  service_area_notes?: string
  profile_image_url?: string
  // Universal extras (cover, gallery, socials, hours, certs, languages,
  // chat handles, contact form, country, custom services, legal, FAQ,
  // CTA effect, avatar frame) all delegated to validateUniversalProfile.
  cover_image_url?:    string | null
  gallery_image_urls?: string[]
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  x_url?:              string | null
  snapchat_url?:       string | null
  website_url?:        string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[]
  languages?:          string[]
  telegram_handle?:    string | null
  wechat_id?:          string | null
  line_id?:            string | null
  kakaotalk_id?:       string | null
  contact_form_enabled?: boolean
  contact_email?:        string | null
  country_code?:            string
  custom_services_offered?: string[]
  cta_button_effect?:  'none' | 'pulse' | 'glow' | 'shake' | null
  avatar_frame_style?: 'none' | 'gradient' | 'pulse' | 'rainbow' | null
  legal_terms?:   string | null
  legal_privacy?: string | null
  faq_items?:     Array<{ q: string; a: string }> | null
  faq_enabled?:   boolean
  // Facial-specific decoration (mig 0104 parity with massage/beautician).
  theme_color?: string | null
  hero_text?: {
    line1?:         string
    line2?:         string
    tagline?:       string
    color?:         string
    line1_color?:   string
    tagline_color?: string
    effect?:        string
  } | null
  promo_text?: string | null
  services_offered?: string[]
  marketplace_categories?: string[]
  busy_dates?: string[]
  service_photos?: Record<string, Array<string | {
    url:          string
    name?:        string
    description?: string
    price_idr?:   number | null
  }>>
  // mig 0228 — static QRIS image URL (vendor's own merchant QR)
  qr_payment_url?: string | null
  // mig 0228 — Pro/Studio draft lock
  is_draft?:       boolean
  draft_password?: string | null
}

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const update: TableUpdate<'facial_providers'> = {}

  // --- Core editable fields -------------------------------------------
  if (typeof body.display_name === 'string') {
    const v = body.display_name.trim()
    if (v.length < 2) return NextResponse.json({ error: 'name_too_short' }, { status: 400 })
    update.display_name = v
  }
  if (body.gender === 'woman' || body.gender === 'man') update.gender = body.gender
  if (typeof body.bio === 'string') {
    const v = body.bio.trim()
    if (v.length > 300) return NextResponse.json({ error: 'bio_too_long' }, { status: 400 })
    update.bio = v
  }
  if (typeof body.years_experience === 'number') {
    if (body.years_experience < 0 || body.years_experience > 60) {
      return NextResponse.json({ error: 'invalid_years' }, { status: 400 })
    }
    update.years_experience = Math.round(body.years_experience)
  }
  for (const k of ['price_60min_idr','price_90min_idr','price_120min_idr'] as const) {
    const v = body[k]
    if (v === null) { update[k] = null; continue }
    if (typeof v === 'number') {
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'invalid_price' }, { status: 400 })
      }
      update[k] = Math.round(v)
    }
  }
  if (typeof body.whatsapp_e164 === 'string') {
    const wa = body.whatsapp_e164.replace(/\s|-/g, '')
    if (!/^\+?\d{8,15}$/.test(wa)) {
      return NextResponse.json({ error: 'invalid_whatsapp' }, { status: 400 })
    }
    update.whatsapp_e164 = wa
  }
  if (typeof body.city === 'string') update.city = body.city.trim() || null
  if (typeof body.service_area_notes === 'string') {
    update.service_area_notes = body.service_area_notes.trim() || null
  }
  if (typeof body.profile_image_url === 'string') {
    const v = body.profile_image_url.trim() || null
    if (v && !isAllowedImageUrl(v)) {
      return NextResponse.json({ error: 'invalid_image_url' }, { status: 400 })
    }
    update.profile_image_url = v
  }

  // --- Universal extras (mig 0072 + 0130/0131/0132/0137/0140/0141/0142) -
  const universal = validateUniversalProfile(body)
  if (!universal.ok) return NextResponse.json({ error: universal.error }, { status: 400 })
  Object.assign(update, universal.fields)

  // --- Facial-specific decoration ------------------------------------
  if (body.theme_color !== undefined) {
    if (body.theme_color === null || body.theme_color === '') {
      update.theme_color = null
    } else if (typeof body.theme_color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(body.theme_color)) {
      return NextResponse.json({ error: 'invalid_theme_color' }, { status: 400 })
    } else {
      update.theme_color = body.theme_color.toUpperCase()
    }
  }

  if (body.hero_text !== undefined) {
    if (body.hero_text === null) {
      update.hero_text = null
    } else if (typeof body.hero_text !== 'object' || Array.isArray(body.hero_text)) {
      return NextResponse.json({ error: 'invalid_hero_text' }, { status: 400 })
    } else {
      const ht = body.hero_text
      const cleaned: Record<string, unknown> = {}
      for (const k of ['line1','line2'] as const) {
        const raw = (ht as Record<string, unknown>)[k]
        if (raw === undefined) continue
        if (typeof raw !== 'string') return NextResponse.json({ error: `invalid_hero_${k}` }, { status: 400 })
        const v = raw.trim()
        if (v.length > 30) return NextResponse.json({ error: `hero_${k}_too_long` }, { status: 400 })
        if (v) cleaned[k] = v
      }
      if (ht.tagline !== undefined) {
        if (typeof ht.tagline !== 'string') return NextResponse.json({ error: 'invalid_hero_tagline' }, { status: 400 })
        const v = ht.tagline.trim()
        if (v.length > 80) return NextResponse.json({ error: 'hero_tagline_too_long' }, { status: 400 })
        if (v) cleaned.tagline = v
      }
      for (const k of ['color','line1_color','tagline_color'] as const) {
        const raw = (ht as Record<string, unknown>)[k]
        if (raw === undefined) continue
        if (typeof raw !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(raw)) {
          return NextResponse.json({ error: `invalid_hero_${k}` }, { status: 400 })
        }
        cleaned[k] = raw.toUpperCase()
      }
      if (ht.effect !== undefined) {
        if (typeof ht.effect !== 'string' || !ALLOWED_HERO_EFFECTS.has(ht.effect)) {
          return NextResponse.json({ error: 'invalid_hero_effect' }, { status: 400 })
        }
        cleaned.effect = ht.effect
      }
      update.hero_text = (Object.keys(cleaned).length ? cleaned : null) as Json
    }
  }

  if (body.promo_text !== undefined) {
    if (body.promo_text === null || body.promo_text === '') {
      update.promo_text = null
    } else if (typeof body.promo_text !== 'string') {
      return NextResponse.json({ error: 'invalid_promo_text' }, { status: 400 })
    } else {
      const trimmed = body.promo_text.trim()
      if (trimmed.length > 500) {
        return NextResponse.json({ error: 'promo_text_too_long' }, { status: 400 })
      }
      update.promo_text = trimmed || null
    }
  }

  // services_offered + marketplace_categories — text[] with no enum on
  // facial_providers, so we just enforce shape + caps. The catalog
  // lives in src/lib/facial/types.ts; new ids can be added there
  // without a follow-up DB migration.
  if (body.services_offered !== undefined) {
    if (!Array.isArray(body.services_offered)) {
      return NextResponse.json({ error: 'invalid_services_offered' }, { status: 400 })
    }
    if (body.services_offered.length > 20) {
      return NextResponse.json({ error: 'too_many_services' }, { status: 400 })
    }
    const cleaned: string[] = []
    for (const s of body.services_offered) {
      if (typeof s !== 'string') return NextResponse.json({ error: 'invalid_service_entry' }, { status: 400 })
      const v = s.trim()
      if (!v || v.length > 60) return NextResponse.json({ error: 'invalid_service_entry' }, { status: 400 })
      if (!cleaned.includes(v)) cleaned.push(v)
    }
    update.services_offered = cleaned
  }
  if (body.marketplace_categories !== undefined) {
    if (!Array.isArray(body.marketplace_categories)) {
      return NextResponse.json({ error: 'invalid_marketplace_categories' }, { status: 400 })
    }
    if (body.marketplace_categories.length > 3) {
      return NextResponse.json({ error: 'too_many_marketplace_categories' }, { status: 400 })
    }
    const cleaned: string[] = []
    for (const c of body.marketplace_categories) {
      if (typeof c !== 'string') return NextResponse.json({ error: 'invalid_marketplace_category' }, { status: 400 })
      const v = c.trim()
      if (!v || v.length > 60) return NextResponse.json({ error: 'invalid_marketplace_category' }, { status: 400 })
      if (!cleaned.includes(v)) cleaned.push(v)
    }
    update.marketplace_categories = cleaned
  }

  if (body.busy_dates !== undefined) {
    if (!Array.isArray(body.busy_dates)) {
      return NextResponse.json({ error: 'invalid_busy_dates' }, { status: 400 })
    }
    const cleaned: string[] = []
    for (const d of body.busy_dates) {
      if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return NextResponse.json({ error: 'invalid_busy_date' }, { status: 400 })
      }
      if (!cleaned.includes(d)) cleaned.push(d)
    }
    update.busy_dates = cleaned
  }

  if (body.service_photos !== undefined) {
    const sp = body.service_photos
    if (sp === null || typeof sp !== 'object' || Array.isArray(sp)) {
      return NextResponse.json({ error: 'invalid_service_photos' }, { status: 400 })
    }
    const cleaned: Record<string, Array<Record<string, unknown>>> = {}
    for (const [k, v] of Object.entries(sp)) {
      if (typeof k !== 'string' || !k.trim()) {
        return NextResponse.json({ error: 'invalid_service_photo_key' }, { status: 400 })
      }
      if (!Array.isArray(v)) {
        return NextResponse.json({ error: 'invalid_service_photo_array' }, { status: 400 })
      }
      if (v.length > 4) {
        return NextResponse.json({ error: 'too_many_photos_for_service' }, { status: 400 })
      }
      const entries: Array<Record<string, unknown>> = []
      for (const raw of v) {
        let url: string, name: string | undefined, description: string | undefined, price: number | null | undefined
        if (typeof raw === 'string') {
          url = raw.trim()
        } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          const o = raw as Record<string, unknown>
          if (typeof o.url !== 'string') {
            return NextResponse.json({ error: 'invalid_service_photo_url' }, { status: 400 })
          }
          url = o.url.trim()
          if (o.name !== undefined) {
            if (typeof o.name !== 'string') return NextResponse.json({ error: 'invalid_photo_name' }, { status: 400 })
            const n = o.name.trim()
            if (n.length > 60) return NextResponse.json({ error: 'photo_name_too_long' }, { status: 400 })
            name = n || undefined
          }
          if (o.description !== undefined) {
            if (typeof o.description !== 'string') return NextResponse.json({ error: 'invalid_photo_description' }, { status: 400 })
            const d = o.description.trim()
            if (d.length > 500) return NextResponse.json({ error: 'photo_description_too_long' }, { status: 400 })
            description = d || undefined
          }
          if (o.price_idr !== undefined && o.price_idr !== null) {
            if (typeof o.price_idr !== 'number' || !Number.isFinite(o.price_idr) || o.price_idr < 0) {
              return NextResponse.json({ error: 'invalid_photo_price' }, { status: 400 })
            }
            price = Math.round(o.price_idr)
          } else if (o.price_idr === null) {
            price = null
          }
        } else {
          return NextResponse.json({ error: 'invalid_service_photo_entry' }, { status: 400 })
        }
        if (!url) continue
        if (!isAllowedImageUrl(url)) {
          return NextResponse.json({ error: 'invalid_service_photo_host' }, { status: 400 })
        }
        const entry: Record<string, unknown> = { url }
        if (name)                entry.name = name
        if (description)         entry.description = description
        if (price !== undefined) entry.price_idr = price
        entries.push(entry)
      }
      if (entries.length > 0) cleaned[k] = entries
    }
    update.service_photos = cleaned as Json
  }

  // mig 0228 — static QRIS image URL. Same host allowlist as other
  // profile images. Empty / null clears the field which hides the
  // public-profile "Pay deposit via QRIS" block.
  if (body.qr_payment_url !== undefined) {
    const raw = body.qr_payment_url
    const v = typeof raw === 'string' ? raw.trim() || null : null
    if (v && !isAllowedImageUrl(v)) {
      return NextResponse.json({ error: 'invalid_qr_payment_url' }, { status: 400 })
    }
    ;(update as Record<string, unknown>).qr_payment_url = v
  }

  // mig 0228 — draft lock. is_draft + draft_password move together so
  // the DB check constraint (draft on => password non-empty) is
  // satisfiable. When the caller turns draft OFF we also blank the
  // password so it doesn't linger in the DB.
  const draftFields: { is_draft?: boolean; draft_password?: string | null } = {}
  if (body.is_draft !== undefined) {
    if (typeof body.is_draft !== 'boolean') {
      return NextResponse.json({ error: 'invalid_is_draft' }, { status: 400 })
    }
    draftFields.is_draft = body.is_draft
  }
  if (body.draft_password !== undefined) {
    const raw = body.draft_password
    if (raw === null) {
      draftFields.draft_password = null
    } else if (typeof raw !== 'string') {
      return NextResponse.json({ error: 'invalid_draft_password' }, { status: 400 })
    } else {
      const trimmed = raw.trim()
      if (trimmed.length === 0) {
        draftFields.draft_password = null
      } else if (trimmed.length > 200) {
        return NextResponse.json({ error: 'draft_password_too_long' }, { status: 400 })
      } else {
        draftFields.draft_password = trimmed
      }
    }
  }
  if (draftFields.is_draft === true && draftFields.draft_password == null) {
    const { data: existing } = await admin
      .from('facial_providers')
      .select('draft_password')
      .eq('user_id', user.id)
      .maybeSingle()
    const existingPw = (existing as { draft_password?: string | null } | null)?.draft_password
    if (!existingPw || !existingPw.trim()) {
      return NextResponse.json({ error: 'draft_password_required' }, { status: 400 })
    }
  }
  if (draftFields.is_draft === false && draftFields.draft_password === undefined) {
    draftFields.draft_password = null
  }
  if (Object.keys(draftFields).length > 0) {
    Object.assign(update as Record<string, unknown>, draftFields)
  }


  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const { data, error } = await admin
    .from('facial_providers')
    .update(update)
    .eq('user_id', user.id)
    .select('id, slug')
    .single()

  if (error) {
    console.error('[facial/me/profile] update failed', error)
    return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'no_provider_row' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
