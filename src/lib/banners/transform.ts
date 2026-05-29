// ============================================================================
// bannerSrc — global banner-image transform helper
// ----------------------------------------------------------------------------
// All banner images render in a 16:9 frame with `object-cover`. Source
// photos rarely match that ratio, so we ask ImageKit to subject-aware
// crop the source to 16:9 at the URL layer. This is the "Smart crop /
// face detect" option from scripts/preview-banner.html — chosen as the
// global rule on 2026-05-29.
//
// Behaviour:
//   • ik.imagekit.io URLs → append `tr=ar-16-9,w-1600,fo-auto` so
//     ImageKit returns a pre-cropped 1600×900 image (subject centred).
//   • non-ImageKit URLs → returned unchanged (we don't host or transform
//     them; the page still renders them inside the 16:9 + object-cover
//     frame, so they'll crop conventionally).
//   • Empty / null / non-string inputs → null. Callers fall back to
//     their vertical's DEFAULT_HERO.
//
// Idempotent: if the URL already carries a `tr=` parameter (e.g. the
// vendor pasted a pre-transformed link), we leave it alone — no double
// transform.
// ============================================================================

const IMAGEKIT_HOST = 'ik.imagekit.io'
const DEFAULT_TRANSFORM = 'ar-16-9,w-1600,fo-auto'

export function bannerSrc(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Non-ImageKit URLs pass through (we cannot transform them).
  if (!trimmed.includes(IMAGEKIT_HOST)) return trimmed

  // Already carries an explicit `tr=` — respect the caller's choice.
  // We match `?tr=` or `&tr=` so existing transformed URLs (the only
  // legitimate way a caller would have authored `tr=`) are preserved.
  if (/[?&]tr=/.test(trimmed)) return trimmed

  // Append the default transform. Two URL shapes need different joins:
  //   • bare path:                ?tr=…
  //   • already has query string: &tr=…
  const sep = trimmed.includes('?') ? '&' : '?'
  return `${trimmed}${sep}tr=${DEFAULT_TRANSFORM}`
}
