// Shared banner-library types and helpers — vertical-agnostic.
//
// Each vertical (beautician, handyman, …) defines its own BANNER_LIBRARY
// data file using these types so the same `<BannerLibraryPicker>`
// component can serve every dashboard.

export type BannerLibraryEntry =
  | string
  | { url: string; premium?: boolean; price_idr?: number }

export type BannerCategory = { id: string; label: string }

// First key: theme hex (uppercase). Second key: category id. Value: ordered list of banners.
export type BannerLibrary = Record<string, Record<string, BannerLibraryEntry[]>>

export function resolveBanner(
  entry: BannerLibraryEntry,
): { url: string; premium: boolean; price_idr: number } {
  if (typeof entry === 'string') return { url: entry, premium: false, price_idr: 0 }
  return { url: entry.url, premium: !!entry.premium, price_idr: entry.price_idr ?? 100000 }
}

// Deterministic djb2 hash → a stable 1-9999 banner number used for admin
// requests like "make banner #452 premium". Same URL → same number across reloads.
export function bannerNumber(url: string): number {
  let h = 5381
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) | 0
  }
  return (Math.abs(h) % 9999) + 1
}
