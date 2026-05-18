// Slug helpers — URL-safe, Indonesian-friendly.

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/

// Reserved slugs that would collide with routes or look-and-feel concerns.
const RESERVED = new Set([
  'admin', 'api', 'app', 'cari', 'cityrider', 'dashboard', 'forgot',
  'login', 'me', 'new', 'onboarding', 'pricing', 'privacy', 'profile',
  'r', 'services', 'settings', 'signup', 'staff', 'support', 'terms',
])

export function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')     // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')         // drop non-alphanumerics
    .trim()
    .replace(/[\s-]+/g, '-')              // collapse spaces / dashes
    .replace(/^-+|-+$/g, '')              // trim leading/trailing dashes
    .slice(0, 40)
}

export function isValidSlug(slug: string): boolean {
  if (!slug) return false
  if (RESERVED.has(slug)) return false
  return SLUG_RE.test(slug)
}

export function slugReason(slug: string): string | null {
  if (!slug) return 'Pick a short link for your booking page'
  if (RESERVED.has(slug)) return `"${slug}" is reserved — please choose another`
  if (slug.length < 3) return 'Must be at least 3 characters'
  if (slug.length > 40) return 'Must be 40 characters or fewer'
  if (!SLUG_RE.test(slug)) return 'Only lowercase letters, numbers, and dashes'
  return null
}
