// Shared validator for mig 0072 universal profile fields. Each
// /api/{vertical}/me/profile route calls this AFTER its own vertical
// fields have been pulled, then merges the returned partial into the
// update payload.
//
// Returns { ok: true, fields } on success, or { ok: false, error } if any
// field is invalid (so the route can early-return a 400). All fields are
// optional — missing fields aren't validated.

import { isAllowedImageUrl } from '@/lib/validation/images'
import { countryByCode } from '@/lib/data/countries'

export type UniversalProfileBody = {
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
  // mig 0131
  country_code?:            string
  custom_services_offered?: string[]
  // mig 0132 — chat handles
  telegram_handle?: string | null
  wechat_id?:       string | null
  line_id?:         string | null
  kakaotalk_id?:    string | null
  // mig 0137 — contact form opt-in
  contact_form_enabled?: boolean
  contact_email?:        string | null
  // mig 0140 — primary CTA animation
  cta_button_effect?: 'none' | 'pulse' | 'glow' | 'shake' | null
  // mig 0141 — Animated avatar frame style
  avatar_frame_style?: 'none' | 'gradient' | 'pulse' | 'rainbow' | null
  // mig 0142 — Legal pages + FAQ stored on the provider row
  legal_terms?:   string | null
  legal_privacy?: string | null
  faq_items?:     Array<{ q: string; a: string }> | null
  faq_enabled?:   boolean
}

type Result =
  | { ok: true;  fields: Record<string, unknown> }
  | { ok: false; error: string }

const MAX_GALLERY     = 12
const MAX_CERTS       = 20
const MAX_LANG_CODES  = 10
const VALID_DAY_KEYS  = new Set(['mon','tue','wed','thu','fri','sat','sun'])
const HOURS_RE        = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/
// Allow common social-network hosts only — keeps a tukang from pasting a
// random URL that the public page renders as "Instagram". Website is
// host-agnostic (any https URL) since providers run their own domains.
const SOCIAL_HOST_RE = {
  instagram: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\//i,
  tiktok:    /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)\//i,
  facebook:  /^https?:\/\/(www\.)?(facebook\.com|fb\.com|m\.facebook\.com)\//i,
  x:         /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i,
  snapchat:  /^https?:\/\/(www\.)?(snapchat\.com)\//i,
  website:   /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
}

export function validateUniversalProfile(body: UniversalProfileBody): Result {
  const out: Record<string, unknown> = {}

  if (body.cover_image_url !== undefined) {
    const v = typeof body.cover_image_url === 'string' ? body.cover_image_url.trim() || null : null
    if (v && !isAllowedImageUrl(v)) return { ok: false, error: 'invalid_cover_url' }
    out.cover_image_url = v
  }

  if (body.gallery_image_urls !== undefined) {
    if (!Array.isArray(body.gallery_image_urls)) return { ok: false, error: 'invalid_gallery' }
    if (body.gallery_image_urls.length > MAX_GALLERY) return { ok: false, error: 'gallery_too_long' }
    const clean: string[] = []
    for (const url of body.gallery_image_urls) {
      if (typeof url !== 'string') return { ok: false, error: 'invalid_gallery_entry' }
      const v = url.trim()
      if (!v) continue
      if (!isAllowedImageUrl(v)) return { ok: false, error: 'invalid_gallery_url' }
      clean.push(v)
    }
    out.gallery_image_urls = clean
  }

  for (const k of ['instagram_url','tiktok_url','facebook_url','x_url','snapchat_url','website_url'] as const) {
    if (body[k] === undefined) continue
    const raw = body[k]
    const v = typeof raw === 'string' ? raw.trim() || null : null
    if (v) {
      const host = k === 'instagram_url' ? SOCIAL_HOST_RE.instagram
                 : k === 'tiktok_url'    ? SOCIAL_HOST_RE.tiktok
                 : k === 'facebook_url'  ? SOCIAL_HOST_RE.facebook
                 : k === 'x_url'         ? SOCIAL_HOST_RE.x
                 : k === 'snapchat_url'  ? SOCIAL_HOST_RE.snapchat
                 :                          SOCIAL_HOST_RE.website
      if (!host.test(v)) return { ok: false, error: `invalid_${k}` }
      if (v.length > 500) return { ok: false, error: `${k}_too_long` }
    }
    out[k] = v
  }

  if (body.operating_hours !== undefined) {
    if (body.operating_hours === null) {
      out.operating_hours = null
    } else if (typeof body.operating_hours !== 'object' || Array.isArray(body.operating_hours)) {
      return { ok: false, error: 'invalid_hours' }
    } else {
      const cleaned: Record<string, string> = {}
      for (const [k, v] of Object.entries(body.operating_hours)) {
        if (!VALID_DAY_KEYS.has(k)) return { ok: false, error: 'invalid_hours_day' }
        if (typeof v !== 'string') return { ok: false, error: 'invalid_hours_value' }
        const trimmed = v.trim()
        if (!trimmed) continue
        if (!HOURS_RE.test(trimmed)) return { ok: false, error: 'invalid_hours_format' }
        cleaned[k] = trimmed
      }
      out.operating_hours = Object.keys(cleaned).length ? cleaned : null
    }
  }

  if (body.certifications !== undefined) {
    if (!Array.isArray(body.certifications)) return { ok: false, error: 'invalid_certifications' }
    if (body.certifications.length > MAX_CERTS) return { ok: false, error: 'too_many_certifications' }
    const cleaned: string[] = []
    for (const c of body.certifications) {
      if (typeof c !== 'string') return { ok: false, error: 'invalid_certification_entry' }
      const v = c.trim()
      if (!v) continue
      if (v.length > 80) return { ok: false, error: 'certification_too_long' }
      cleaned.push(v)
    }
    out.certifications = cleaned
  }

  if (body.languages !== undefined) {
    if (!Array.isArray(body.languages)) return { ok: false, error: 'invalid_languages' }
    if (body.languages.length > MAX_LANG_CODES) return { ok: false, error: 'too_many_languages' }
    const cleaned: string[] = []
    for (const l of body.languages) {
      if (typeof l !== 'string') return { ok: false, error: 'invalid_language_entry' }
      const v = l.trim().toLowerCase()
      if (!v) continue
      if (!/^[a-z]{2,3}$/.test(v)) return { ok: false, error: 'invalid_language_code' }
      cleaned.push(v)
    }
    out.languages = cleaned
  }

  // mig 0131 — ISO 3166-1 alpha-2 country code. countryByCode() falls
  // back to Indonesia for unknown codes, so reject anything not in our
  // lookup explicitly to keep the column meaningful for currency/dial.
  if (body.country_code !== undefined) {
    if (typeof body.country_code !== 'string') return { ok: false, error: 'invalid_country_code' }
    const v = body.country_code.trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(v)) return { ok: false, error: 'invalid_country_code' }
    const resolved = countryByCode(v)
    if (resolved.code !== v) return { ok: false, error: 'unknown_country_code' }
    out.country_code = v
  }

  // mig 0131 — Free-form service names the provider added themselves.
  // De-dupe + trim + length-cap; max 20 entries enforced by DB CHECK.
  if (body.custom_services_offered !== undefined) {
    if (!Array.isArray(body.custom_services_offered)) return { ok: false, error: 'invalid_custom_services' }
    if (body.custom_services_offered.length > 20) return { ok: false, error: 'too_many_custom_services' }
    const seen = new Set<string>()
    const cleaned: string[] = []
    for (const s of body.custom_services_offered) {
      if (typeof s !== 'string') return { ok: false, error: 'invalid_custom_service_entry' }
      const v = s.trim()
      if (!v) continue
      if (v.length > 60) return { ok: false, error: 'custom_service_too_long' }
      const key = v.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      cleaned.push(v)
    }
    out.custom_services_offered = cleaned
  }

  // mig 0132 — Chat handles. Free-form text per platform; basic trim +
  // length cap (60). Telegram accepts @handle, t.me URL, or +phone;
  // others are platform IDs (alphanumeric + symbols).
  for (const k of ['telegram_handle','wechat_id','line_id','kakaotalk_id'] as const) {
    if (body[k] === undefined) continue
    const raw = body[k]
    const v = typeof raw === 'string' ? raw.trim() || null : null
    if (v) {
      if (v.length > 60) return { ok: false, error: `${k}_too_long` }
      // Loose accept — strip illegal whitespace, keep printable chars
      // including @, +, /, ., -, _, digits, letters. Reject anything else.
      if (!/^[A-Za-z0-9@+./_\-:]+$/.test(v)) return { ok: false, error: `invalid_${k}` }
    }
    out[k] = v
  }

  // mig 0137 — Contact form opt-in. Both fields validated independently
  // so partial saves (e.g. just setting the email, then later toggling
  // on) don't 400. The public profile gates the button on
  // (contact_form_enabled AND contact_email) so a missing email simply
  // hides the button without an error.
  if (body.contact_form_enabled !== undefined) {
    if (typeof body.contact_form_enabled !== 'boolean') return { ok: false, error: 'invalid_contact_form_enabled' }
    out.contact_form_enabled = body.contact_form_enabled
  }
  if (body.contact_email !== undefined) {
    const raw = body.contact_email
    const v = typeof raw === 'string' ? raw.trim() || null : null
    if (v) {
      if (v.length > 254) return { ok: false, error: 'contact_email_too_long' }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return { ok: false, error: 'invalid_contact_email' }
    }
    out.contact_email = v
  }

  // mig 0140 — Primary CTA button animation. Must be one of the four
  // allowlisted values; DB CHECK enforces this independently but the
  // route shouldn't 500 on a typo from the client.
  if (body.cta_button_effect !== undefined) {
    const v = body.cta_button_effect
    if (v !== null && v !== 'none' && v !== 'pulse' && v !== 'glow' && v !== 'shake') {
      return { ok: false, error: 'invalid_cta_button_effect' }
    }
    out.cta_button_effect = v ?? 'none'
  }

  // mig 0141 — Animated avatar frame style. Same defensive pattern as
  // cta_button_effect above: DB CHECK is the source of truth, but
  // catching invalid values here gives the client a 400 instead of a 500.
  if (body.avatar_frame_style !== undefined) {
    const v = body.avatar_frame_style
    if (v !== null && v !== 'none' && v !== 'gradient' && v !== 'pulse' && v !== 'rainbow') {
      return { ok: false, error: 'invalid_avatar_frame_style' }
    }
    out.avatar_frame_style = v ?? 'none'
  }

  // mig 0142 — Long-form legal copy stored on the provider row. ~20k
  // char ceiling apiece keeps a single profile payload sane. Empty
  // strings clear the column so the public footer hides the link.
  for (const k of ['legal_terms','legal_privacy'] as const) {
    if (body[k] === undefined) continue
    const raw = body[k]
    if (raw === null) { out[k] = null; continue }
    if (typeof raw !== 'string') return { ok: false, error: `invalid_${k}` }
    const v = raw.replace(/\r\n/g, '\n')
    if (v.length > 20000) return { ok: false, error: `${k}_too_long` }
    out[k] = v.trim() ? v : null
  }

  // mig 0142 — FAQ list (array of {q,a}). Trim, drop empty entries, and
  // enforce a 30-question / 200-char Q / 2000-char A ceiling so a single
  // jsonb column doesn't bloat. Empty array clears the FAQ entirely.
  if (body.faq_items !== undefined) {
    if (body.faq_items === null) {
      out.faq_items = []
    } else if (!Array.isArray(body.faq_items)) {
      return { ok: false, error: 'invalid_faq_items' }
    } else if (body.faq_items.length > 30) {
      return { ok: false, error: 'too_many_faq_items' }
    } else {
      const cleaned: Array<{ q: string; a: string }> = []
      for (const item of body.faq_items) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return { ok: false, error: 'invalid_faq_entry' }
        }
        const q = typeof item.q === 'string' ? item.q.trim() : ''
        const a = typeof item.a === 'string' ? item.a.trim() : ''
        if (q.length > 200) return { ok: false, error: 'faq_q_too_long' }
        if (a.length > 2000) return { ok: false, error: 'faq_a_too_long' }
        if (!q && !a) continue
        cleaned.push({ q, a })
      }
      out.faq_items = cleaned
    }
  }

  if (body.faq_enabled !== undefined) {
    if (typeof body.faq_enabled !== 'boolean') return { ok: false, error: 'invalid_faq_enabled' }
    out.faq_enabled = body.faq_enabled
  }

  return { ok: true, fields: out }
}
