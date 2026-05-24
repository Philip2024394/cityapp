// Shared validator for mig 0072 universal profile fields. Each
// /api/{vertical}/me/profile route calls this AFTER its own vertical
// fields have been pulled, then merges the returned partial into the
// update payload.
//
// Returns { ok: true, fields } on success, or { ok: false, error } if any
// field is invalid (so the route can early-return a 400). All fields are
// optional — missing fields aren't validated.

import { isAllowedImageUrl } from '@/lib/validation/images'

export type UniversalProfileBody = {
  cover_image_url?:    string | null
  gallery_image_urls?: string[]
  instagram_url?:      string | null
  tiktok_url?:         string | null
  facebook_url?:       string | null
  operating_hours?:    Record<string, string> | null
  certifications?:     string[]
  languages?:          string[]
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
// random URL that the public page renders as "Instagram".
const SOCIAL_HOST_RE = {
  instagram: /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\//i,
  tiktok:    /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)\//i,
  facebook:  /^https?:\/\/(www\.)?(facebook\.com|fb\.com|m\.facebook\.com)\//i,
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

  for (const k of ['instagram_url','tiktok_url','facebook_url'] as const) {
    if (body[k] === undefined) continue
    const raw = body[k]
    const v = typeof raw === 'string' ? raw.trim() || null : null
    if (v) {
      const host = k === 'instagram_url' ? SOCIAL_HOST_RE.instagram
                 : k === 'tiktok_url'    ? SOCIAL_HOST_RE.tiktok
                 :                          SOCIAL_HOST_RE.facebook
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

  return { ok: true, fields: out }
}
