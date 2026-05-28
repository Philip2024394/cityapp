import { redirect } from 'next/navigation'

// ============================================================================
// /cari/rider — Legacy redirect (retired 2026-05-28)
// ----------------------------------------------------------------------------
// The old rider-results page (43KB) was retired in favour of the new card-
// based /cari booking flow. 17+ callers (beautician/handyman/massage/tour
// profile pages, dashboard widgets, VisitUsPanel, API helpers, etc.) still
// link to `/cari/rider?dLat=...&dLng=...&dName=...` so this file exists
// purely to forward those URLs to `/cari` with all query params preserved.
//
// Server component → uses `redirect()` from next/navigation so the bounce
// happens with a 307 before any client JS loads. Next 15 hands
// `searchParams` as a Promise.
// ============================================================================

export default async function CariRiderRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v)
    } else {
      qs.append(key, value)
    }
  }
  const query = qs.toString()
  redirect(query ? `/cari?${query}` : '/cari')
}
