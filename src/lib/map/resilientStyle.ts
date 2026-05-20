// ============================================================================
// Multi-origin tile failover for MapLibre.
// ----------------------------------------------------------------------------
// Fetches the OpenFreeMap base style and patches every vector tile source's
// `tiles` array to include backup URLs. MapLibre tries each URL in order
// when fetching a tile — if the primary 5xx's or times out, the next URL
// is hit transparently. Combined with the Service Worker tile cache, this
// covers four failure modes:
//
//   1. Network blip → SW returns cached tile
//   2. Tile not yet in cache + primary slow/down → MapLibre tries backup
//   3. All providers down + tile is cached → SW returns cached even if stale
//   4. All providers down + no cache → SW returns a transparent 1x1 PNG
//      so the map shows blank instead of red-bordered error tiles
//
// PROVIDER NOTES:
//   • OpenFreeMap — free, no API key, OpenMapTiles schema (planet vector)
//   • Stadia Maps — 200k req/month free tier without API key, same schema
//
// Both providers serve OpenMapTiles-schema vector tiles, so the style's
// layer definitions render correctly against either. Sprite + glyphs URLs
// stay pointed at OpenFreeMap — those load once per session and the SW
// caches them, so a Stadia hit doesn't need its own sprite endpoint.
// ============================================================================

const OPENFREEMAP_STYLE_URLS = {
  positron: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const

// Stadia OpenMapTiles vector pyramid — same schema as OpenFreeMap so the
// layer definitions in the OpenFreeMap style render correctly against
// these tiles too. {z}/{x}/{y} placeholders are filled by MapLibre.
const STADIA_TILE_URL =
  'https://tiles.stadiamaps.com/data/openmaptiles/{z}/{x}/{y}.pbf'

// Bare-minimum fallback style returned when everything (fetch + cache)
// fails on first load. Dark background, no layers — the user at least
// sees a coloured canvas instead of a broken map widget.
function emptyFallbackStyle(variant: 'positron' | 'dark'): MapStyleSpec {
  return {
    version: 8,
    name: 'CR fallback',
    sources: {},
    sprite: '',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': variant === 'dark' ? '#0A0A0A' : '#F5F5F0' },
      },
    ],
  }
}

// Minimal style shape we touch — we deliberately type only the fields we
// modify so we don't have to import MapLibre's enormous Style type just
// to read source.tiles.
type MapStyleSpec = {
  version: 8
  name?: string
  sources: Record<string, { type?: string; tiles?: string[]; url?: string; [k: string]: unknown }>
  sprite?: string
  glyphs?: string
  layers: Array<{ id: string; type: string; paint?: Record<string, unknown>; [k: string]: unknown }>
  [k: string]: unknown
}

const styleCache = new Map<'positron' | 'dark', Promise<MapStyleSpec>>()

/**
 * Fetches the OpenFreeMap style for the given variant, patches each
 * vector source's `tiles` array to include Stadia URLs as backup, and
 * resolves the source's `url` reference (if any) so MapLibre doesn't
 * need a second network round-trip for the source descriptor.
 *
 * Result is memoised per variant for the lifetime of the page — the style
 * doesn't change between renders, so we never re-fetch within a session.
 */
export function getResilientStyle(variant: 'positron' | 'dark'): Promise<MapStyleSpec> {
  const existing = styleCache.get(variant)
  if (existing) return existing

  const promise = (async (): Promise<MapStyleSpec> => {
    try {
      const res = await fetch(OPENFREEMAP_STYLE_URLS[variant], { cache: 'force-cache' })
      if (!res.ok) throw new Error(`style ${res.status}`)
      const raw = (await res.json()) as MapStyleSpec
      return await patchStyleWithFallbacks(raw)
    } catch {
      // If the style fetch itself fails (rare — OpenFreeMap CDN down),
      // return a bare dark/light canvas so the map widget doesn't crash.
      return emptyFallbackStyle(variant)
    }
  })()

  styleCache.set(variant, promise)
  return promise
}

async function patchStyleWithFallbacks(style: MapStyleSpec): Promise<MapStyleSpec> {
  const sources = { ...style.sources }
  for (const [name, sourceRaw] of Object.entries(sources)) {
    const source = { ...sourceRaw }
    // OpenFreeMap defines vector sources as { url: 'https://tiles.openfreemap.org/planet' }
    // We resolve that to its TileJSON, extract the tiles array, and add
    // Stadia as a fallback URL.
    if (typeof source.url === 'string' && !source.tiles) {
      try {
        const tj = await fetch(source.url, { cache: 'force-cache' }).then((r) => r.json()) as {
          tiles?: string[]
          [k: string]: unknown
        }
        if (Array.isArray(tj.tiles) && tj.tiles.length > 0) {
          source.tiles = [...tj.tiles, STADIA_TILE_URL]
          // Copy through the rest of the TileJSON fields MapLibre cares
          // about (minzoom, maxzoom, bounds) so we don't lose them by
          // removing the url indirection.
          if (tj.minzoom !== undefined) source.minzoom = tj.minzoom
          if (tj.maxzoom !== undefined) source.maxzoom = tj.maxzoom
          if (tj.bounds !== undefined) source.bounds = tj.bounds
          delete source.url
        }
      } catch {
        // Resolution failed — leave the source as-is and let MapLibre
        // attempt its own resolution; SW cache will catch most cases.
      }
    } else if (Array.isArray(source.tiles) && source.tiles.length > 0) {
      // Source already has explicit tile URLs — append Stadia as a backup
      // if it isn't already in the list.
      if (!source.tiles.includes(STADIA_TILE_URL)) {
        source.tiles = [...source.tiles, STADIA_TILE_URL]
      }
    }
    sources[name] = source
  }
  return { ...style, sources }
}
