import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isAllowedImageUrl } from '@/lib/validation/images'
import type { TableUpdate } from '@/lib/supabase/typed-helpers'
import type { Json } from '@/types/supabase'

// POST /api/places/me/profile — partial update of the signed-in user's
// place row. Mirrors /api/beautician/me/profile, but writes into the
// `places` table with its own column names:
//   * name              (vs display_name)
//   * image_urls        (vs gallery_image_urls)
//   * hours_json        (vs operating_hours)
//   * category          (single, vs services_offered array)
// Moderation columns (status, listing_tier, paid_until, verified) are
// NEVER accepted here — RLS in mig 0011 also enforces that at the DB.

export const runtime = 'nodejs'

type Body = {
  name?: string
  business_name?: string | null
  bio?: string | null
  description?: string | null
  category?: string
  cuisine_types?: string[]
  hours_json?: Record<string, string> | null
  image_urls?: string[]
  cover_image_url?: string | null
  profile_image_url?: string | null
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
  service_photos?: Record<string, Array<string | {
    url:          string
    name?:        string
    description?: string
    price_idr?:   number | null
  }>>
  instagram_url?: string | null
  tiktok_url?:    string | null
  facebook_url?:  string | null
  languages?:     string[]
  dietary_tags?:  string[]
  price_tier?:    string | null
  tags?:          string[]
  free_delivery?: boolean
  delivery_enabled?: boolean
}

const CATEGORY_ALLOWLIST = new Set(['restaurant','cafe','bar','club'])
const PRICE_TIERS        = new Set(['budget','mid','upscale'])
const SOCIAL_HOST_RE = {
  instagram: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\//i,
  tiktok:    /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)\//i,
  facebook:  /^https?:\/\/(www\.)?(facebook\.com|fb\.com|m\.facebook\.com)\//i,
}
const VALID_DAY_KEYS = new Set(['mon','tue','wed','thu','fri','sat','sun'])
const HOURS_RE       = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/

export async function POST(req: Request) {
  const userClient = await getServerSupabase()
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } }
  if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 })

  let body: Body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const update: TableUpdate<'places'> = {}

  if (typeof body.name === 'string') {
    const v = body.name.trim()
    if (v.length < 2) return NextResponse.json({ error: 'name_too_short' }, { status: 400 })
    update.name = v
  }
  if (body.business_name !== undefined) {
    if (body.business_name === null || body.business_name === '') {
      update.business_name = null
    } else if (typeof body.business_name === 'string') {
      update.business_name = body.business_name.trim() || null
    } else {
      return NextResponse.json({ error: 'invalid_business_name' }, { status: 400 })
    }
  }
  if (body.bio !== undefined) {
    if (body.bio === null) update.bio = null
    else if (typeof body.bio === 'string') {
      const v = body.bio.trim()
      if (v.length > 300) return NextResponse.json({ error: 'bio_too_long' }, { status: 400 })
      update.bio = v || null
    } else {
      return NextResponse.json({ error: 'invalid_bio' }, { status: 400 })
    }
  }
  if (body.description !== undefined) {
    if (body.description === null) update.description = null
    else if (typeof body.description === 'string') {
      const v = body.description.trim()
      if (v.length > 1200) return NextResponse.json({ error: 'description_too_long' }, { status: 400 })
      update.description = v || null
    } else {
      return NextResponse.json({ error: 'invalid_description' }, { status: 400 })
    }
  }
  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || !CATEGORY_ALLOWLIST.has(body.category)) {
      return NextResponse.json({ error: 'invalid_category' }, { status: 400 })
    }
    update.category = body.category
  }
  if (body.cuisine_types !== undefined) {
    if (!Array.isArray(body.cuisine_types)) {
      return NextResponse.json({ error: 'invalid_cuisine_types' }, { status: 400 })
    }
    if (body.cuisine_types.length > 12) {
      return NextResponse.json({ error: 'too_many_cuisine_types' }, { status: 400 })
    }
    const cleaned: string[] = []
    for (const c of body.cuisine_types) {
      if (typeof c !== 'string') return NextResponse.json({ error: 'invalid_cuisine_entry' }, { status: 400 })
      const v = c.trim()
      if (!v) continue
      if (v.length > 40) return NextResponse.json({ error: 'cuisine_too_long' }, { status: 400 })
      if (!cleaned.includes(v)) cleaned.push(v)
    }
    update.cuisine_types = cleaned
  }
  if (body.hours_json !== undefined) {
    if (body.hours_json === null) {
      update.hours_json = null
    } else if (typeof body.hours_json !== 'object' || Array.isArray(body.hours_json)) {
      return NextResponse.json({ error: 'invalid_hours' }, { status: 400 })
    } else {
      const cleaned: Record<string, string> = {}
      for (const [k, v] of Object.entries(body.hours_json)) {
        if (!VALID_DAY_KEYS.has(k)) return NextResponse.json({ error: 'invalid_hours_day' }, { status: 400 })
        if (typeof v !== 'string') return NextResponse.json({ error: 'invalid_hours_value' }, { status: 400 })
        const trimmed = v.trim()
        if (!trimmed) continue
        if (!HOURS_RE.test(trimmed)) return NextResponse.json({ error: 'invalid_hours_format' }, { status: 400 })
        cleaned[k] = trimmed
      }
      update.hours_json = Object.keys(cleaned).length ? cleaned : null
    }
  }
  if (body.image_urls !== undefined) {
    if (!Array.isArray(body.image_urls)) return NextResponse.json({ error: 'invalid_image_urls' }, { status: 400 })
    if (body.image_urls.length > 12)     return NextResponse.json({ error: 'gallery_too_long' }, { status: 400 })
    const cleaned: string[] = []
    for (const url of body.image_urls) {
      if (typeof url !== 'string') return NextResponse.json({ error: 'invalid_image_entry' }, { status: 400 })
      const v = url.trim()
      if (!v) continue
      if (!isAllowedImageUrl(v)) return NextResponse.json({ error: 'invalid_image_url' }, { status: 400 })
      cleaned.push(v)
    }
    update.image_urls = cleaned
  }
  if (body.cover_image_url !== undefined) {
    const v = typeof body.cover_image_url === 'string' ? body.cover_image_url.trim() || null : null
    if (v && !isAllowedImageUrl(v)) return NextResponse.json({ error: 'invalid_cover_url' }, { status: 400 })
    update.cover_image_url = v
  }
  if (body.profile_image_url !== undefined) {
    const v = typeof body.profile_image_url === 'string' ? body.profile_image_url.trim() || null : null
    if (v && !isAllowedImageUrl(v)) return NextResponse.json({ error: 'invalid_profile_image_url' }, { status: 400 })
    update.profile_image_url = v
  }

  for (const k of ['instagram_url','tiktok_url','facebook_url'] as const) {
    if (body[k] === undefined) continue
    const raw = body[k]
    const v = typeof raw === 'string' ? raw.trim() || null : null
    if (v) {
      const host = k === 'instagram_url' ? SOCIAL_HOST_RE.instagram
                 : k === 'tiktok_url'    ? SOCIAL_HOST_RE.tiktok
                 :                          SOCIAL_HOST_RE.facebook
      if (!host.test(v)) return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
      if (v.length > 500) return NextResponse.json({ error: `${k}_too_long` }, { status: 400 })
    }
    update[k] = v
  }

  if (body.languages !== undefined) {
    if (!Array.isArray(body.languages)) return NextResponse.json({ error: 'invalid_languages' }, { status: 400 })
    if (body.languages.length > 10)     return NextResponse.json({ error: 'too_many_languages' }, { status: 400 })
    const cleaned: string[] = []
    for (const l of body.languages) {
      if (typeof l !== 'string') return NextResponse.json({ error: 'invalid_language_entry' }, { status: 400 })
      const v = l.trim().toLowerCase()
      if (!v) continue
      if (!/^[a-z]{2,3}$/.test(v)) return NextResponse.json({ error: 'invalid_language_code' }, { status: 400 })
      cleaned.push(v)
    }
    update.languages = cleaned
  }

  if (body.dietary_tags !== undefined) {
    if (!Array.isArray(body.dietary_tags)) return NextResponse.json({ error: 'invalid_dietary_tags' }, { status: 400 })
    if (body.dietary_tags.length > 12)     return NextResponse.json({ error: 'too_many_dietary_tags' }, { status: 400 })
    const cleaned: string[] = []
    for (const t of body.dietary_tags) {
      if (typeof t !== 'string') return NextResponse.json({ error: 'invalid_dietary_entry' }, { status: 400 })
      const v = t.trim()
      if (!v) continue
      if (v.length > 40) return NextResponse.json({ error: 'dietary_too_long' }, { status: 400 })
      if (!cleaned.includes(v)) cleaned.push(v)
    }
    update.dietary_tags = cleaned
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) return NextResponse.json({ error: 'invalid_tags' }, { status: 400 })
    if (body.tags.length > 20)     return NextResponse.json({ error: 'too_many_tags' }, { status: 400 })
    const cleaned: string[] = []
    for (const t of body.tags) {
      if (typeof t !== 'string') return NextResponse.json({ error: 'invalid_tag_entry' }, { status: 400 })
      const v = t.trim()
      if (!v) continue
      if (v.length > 40) return NextResponse.json({ error: 'tag_too_long' }, { status: 400 })
      if (!cleaned.includes(v)) cleaned.push(v)
    }
    update.tags = cleaned
  }

  if (body.price_tier !== undefined) {
    if (body.price_tier === null || body.price_tier === '') {
      update.price_tier = null
    } else if (typeof body.price_tier !== 'string' || !PRICE_TIERS.has(body.price_tier)) {
      return NextResponse.json({ error: 'invalid_price_tier' }, { status: 400 })
    } else {
      update.price_tier = body.price_tier
    }
  }

  if (body.free_delivery !== undefined) {
    if (typeof body.free_delivery !== 'boolean') {
      return NextResponse.json({ error: 'invalid_free_delivery' }, { status: 400 })
    }
    update.free_delivery = body.free_delivery
  }

  if (body.delivery_enabled !== undefined) {
    if (typeof body.delivery_enabled !== 'boolean') {
      return NextResponse.json({ error: 'invalid_delivery_enabled' }, { status: 400 })
    }
    // Cast through Record<string, unknown> because the generated Database
    // types haven't been refreshed with the post-0189 column. Runtime
    // payload is a plain boolean write.
    ;(update as Record<string, unknown>).delivery_enabled = body.delivery_enabled
  }

  if (body.service_photos !== undefined) {
    const sp = body.service_photos
    if (sp === null || typeof sp !== 'object' || Array.isArray(sp)) {
      return NextResponse.json({ error: 'invalid_service_photos' }, { status: 400 })
    }
    const cleaned: Record<string, Array<Record<string, unknown>>> = {}
    for (const [k, v] of Object.entries(sp)) {
      if (typeof k !== 'string' || k.length === 0 || k.length > 60) {
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
        if (name)        entry.name = name
        if (description) entry.description = description
        if (price !== undefined) entry.price_idr = price
        entries.push(entry)
      }
      if (entries.length > 0) cleaned[k] = entries
    }
    update.service_photos = cleaned as Json
  }

  if (body.hero_text !== undefined) {
    if (body.hero_text === null) {
      update.hero_text = null
    } else if (typeof body.hero_text !== 'object' || Array.isArray(body.hero_text)) {
      return NextResponse.json({ error: 'invalid_hero_text' }, { status: 400 })
    } else {
      const ht = body.hero_text
      const ALLOWED_EFFECTS = new Set(['none','shimmer','dance','underline'])
      const cleaned: Record<string, unknown> = {}
      if (ht.line1 !== undefined) {
        if (typeof ht.line1 !== 'string') return NextResponse.json({ error: 'invalid_hero_line1' }, { status: 400 })
        const v = ht.line1.trim()
        if (v.length > 30) return NextResponse.json({ error: 'hero_line1_too_long' }, { status: 400 })
        if (v) cleaned.line1 = v
      }
      if (ht.line2 !== undefined) {
        if (typeof ht.line2 !== 'string') return NextResponse.json({ error: 'invalid_hero_line2' }, { status: 400 })
        const v = ht.line2.trim()
        if (v.length > 30) return NextResponse.json({ error: 'hero_line2_too_long' }, { status: 400 })
        if (v) cleaned.line2 = v
      }
      if (ht.tagline !== undefined) {
        if (typeof ht.tagline !== 'string') return NextResponse.json({ error: 'invalid_hero_tagline' }, { status: 400 })
        const v = ht.tagline.trim()
        if (v.length > 80) return NextResponse.json({ error: 'hero_tagline_too_long' }, { status: 400 })
        if (v) cleaned.tagline = v
      }
      if (ht.color !== undefined) {
        if (typeof ht.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(ht.color)) {
          return NextResponse.json({ error: 'invalid_hero_color' }, { status: 400 })
        }
        cleaned.color = ht.color.toUpperCase()
      }
      for (const k of ['line1_color','tagline_color'] as const) {
        const v = (ht as Record<string, unknown>)[k]
        if (v === undefined) continue
        if (typeof v !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(v)) {
          return NextResponse.json({ error: `invalid_${k}` }, { status: 400 })
        }
        cleaned[k] = v.toUpperCase()
      }
      if (ht.effect !== undefined) {
        if (typeof ht.effect !== 'string' || !ALLOWED_EFFECTS.has(ht.effect)) {
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
      // Places CHECK constraint caps promo_text at 280 chars (mig 0122).
      if (trimmed.length > 280) {
        return NextResponse.json({ error: 'promo_text_too_long' }, { status: 400 })
      }
      update.promo_text = trimmed || null
    }
  }

  if (body.theme_color !== undefined) {
    if (body.theme_color === null || body.theme_color === '') {
      update.theme_color = null
    } else if (typeof body.theme_color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(body.theme_color)) {
      return NextResponse.json({ error: 'invalid_theme_color' }, { status: 400 })
    } else {
      update.theme_color = body.theme_color.toUpperCase()
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const { error } = await admin
    .from('places')
    .update(update)
    .eq('owner_user_id', user.id)
  if (error) return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
