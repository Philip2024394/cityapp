// Reserved subpaths that must never be assigned as a rider slug.
const RESERVED = new Set([
  'admin', 'api', 'dashboard', 'login', 'signup', 'forgot',
  'profile', 'pricing', 'services', 'r', 'app', 'about', 'contact',
])

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function rideSlug(name: string, city: string, hash: string): string {
  const base = `${slugify(name)}-${slugify(city)}`
  const final = `${base}-${hash.slice(0, 4)}`
  if (RESERVED.has(final.split('-')[0]!)) return `rider-${final}`
  return final
}
