// Image URL validation for user-supplied profile + KTP URL fields.
//
// Threat model: a malicious signup posts a profile_image_url pointing at
// a phishing page or NSFW host. The marketplace card renders `<img src>`
// with the URL. CSP `img-src https:` blocks `javascript:` and HTTP, but
// it doesn't restrict the host — so any HTTPS phishing host works.
//
// Mitigation: hard allowlist of image-serving hosts the platform owns
// (or treats as trusted infrastructure). Anything else is rejected at
// the API layer with `invalid_image_url`.
//
// To loosen later: add hosts to ALLOWED_HOSTS or set NEXT_PUBLIC_EXTRA_IMAGE_HOSTS
// (comma-separated list of hostnames) — that env is read on each call so
// it can be tuned without a redeploy.

const ALLOWED_HOSTS = new Set<string>([
  'ik.imagekit.io',          // primary CDN for all marketplace card images
])

// Any Supabase Storage host: <project-ref>.supabase.co / .supabase.in.
const SUPABASE_HOST_RE = /(^|\.)supabase\.(co|in)$/i

const MAX_URL_LEN = 500

export function isAllowedImageUrl(input: unknown): boolean {
  // Empty / unset is fine — the column is nullable.
  if (input == null || input === '') return true
  if (typeof input !== 'string') return false
  if (input.length > MAX_URL_LEN) return false

  let u: URL
  try { u = new URL(input) } catch { return false }
  if (u.protocol !== 'https:') return false

  const host = u.hostname.toLowerCase()
  if (ALLOWED_HOSTS.has(host))         return true
  if (SUPABASE_HOST_RE.test(host))     return true

  // Runtime-extensible allowlist via env, comma-separated. Useful for
  // adding a partner image host without a code change.
  const extra = (process.env.NEXT_PUBLIC_EXTRA_IMAGE_HOSTS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (extra.includes(host)) return true

  return false
}

// Same validator but null-passthrough — useful in the API mapping step.
export function normaliseImageUrl(input: unknown): string | null {
  if (input == null || input === '') return null
  if (!isAllowedImageUrl(input))      return null
  return String(input).trim()
}

// ────────────────────────────────────────────────────────────────────────────
// KTP image reference — accepts EITHER:
//   • New bucket-path format: "<uid>/<filename>.{jpg,jpeg,png,webp}" written
//     by KtpUploader (mig 0065). If `expectedUserId` is supplied, the uid
//     prefix must match — defends against a malicious client pasting another
//     user's path into their own row.
//   • Legacy HTTPS URL on the image allowlist (pre-0065 paste-URL data;
//     will fade out over time as accounts re-verify).
//
// Returns false for arbitrary URLs / scheme abuse / over-length input.
// ────────────────────────────────────────────────────────────────────────────
const KTP_PATH_RE = /^[a-f0-9-]{36}\/[a-zA-Z0-9_.-]+\.(jpe?g|png|webp)$/i

export function isValidKtpRef(input: unknown, expectedUserId?: string): boolean {
  if (input == null || input === '') return true
  if (typeof input !== 'string') return false
  if (input.length > MAX_URL_LEN) return false
  if (KTP_PATH_RE.test(input)) {
    if (!expectedUserId) return true
    return input.toLowerCase().startsWith(`${expectedUserId.toLowerCase()}/`)
  }
  return isAllowedImageUrl(input)
}
