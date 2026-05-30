'use client'
// ============================================================================
// tryLoadDevDriver — DEV-ONLY localhost bypass for driver dashboard subpages
// ----------------------------------------------------------------------------
// The dashboard home pages (rider/car/truck) already gate their reload() on
// the `cr-dev-uid` impersonation cookie set by /api/dev/impersonate. Subpages
// (info / edit / vehicle / services / payments / subscription / stats / qr /
// faq) each run their own supabase.auth.getUser() and would otherwise show
// "Sign in to access" for a localhost impersonated user.
//
// This helper centralises that bypass so every subpage adds the same
// 3-line prelude to its reload() and shares one code path. It is a no-op
// off-localhost and a no-op when the dev cookie is absent — callers always
// fall through to their existing Supabase Auth flow.
//
// IMPORTANT: never gates production. Hostname guard + /api/dev/driver also
// guards itself server-side (returns 404 off-localhost).
// ============================================================================

export type DevDriverContext = {
  userId: string
  driver: Record<string, unknown>
} | null

export async function tryLoadDevDriver(): Promise<DevDriverContext> {
  if (typeof window === 'undefined') return null
  const h = window.location.hostname
  if (h !== 'localhost' && h !== '127.0.0.1') return null
  try {
    const r = await fetch('/api/dev/driver', { cache: 'no-store' })
    if (!r.ok) return null
    const j = (await r.json()) as { driver: Record<string, unknown> | null }
    if (!j.driver) return null
    const userId = j.driver.user_id
    if (typeof userId !== 'string' || !userId) return null
    return { userId, driver: j.driver }
  } catch {
    return null
  }
}
