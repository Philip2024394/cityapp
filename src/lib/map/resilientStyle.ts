// ============================================================================
// Tile resilience for MapLibre — two-mode style builder.
// ----------------------------------------------------------------------------
// PRIMARY MODE (when NEXT_PUBLIC_PMTILES_URL is set):
//   • Tile bytes: self-hosted PMTiles on Cloudflare R2 (zero third-party
//     dependency for the bulk data flow)
//   • Layer definitions: protomaps-themes-base v4 — generates a complete
//     layer set whose `source-layer` names exactly match the Protomaps
//     Basemap schema in our PMTiles file (`roads`, `places`, `buildings`,
//     `water`, etc.) — critical, because the OpenFreeMap style we used
//     before referenced different layer names (`transportation`, `place`,
//     `building`) so nothing painted.
//   • Glyphs + sprite: Protomaps' free CDN (tiny static assets cached
//     by the browser forever; not worth re-hosting at our scale)
//
// FALLBACK MODE (env var unset — dev / kill switch):
//   • Tile bytes + style: OpenFreeMap (third-party but reliable)
//
// Combined with the Service Worker tile cache, this covers:
//   1. Network blip → SW returns cached tile
//   2. Cold tile + primary slow → MapLibre's own retry
//   3. All providers down + tile cached → SW serves stale
//   4. All providers down + no cache → SW returns transparent 1x1 PNG
// ============================================================================

import { layers as protomapsLayers, namedTheme } from 'protomaps-themes-base'

const OPENFREEMAP_STYLE_URLS = {
  positron: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const

// Protomaps publishes free font + sprite assets at github.io. Tiny
// payload, cached forever after first hit — not worth re-hosting in R2
// just to claim full self-hosting.
const PROTOMAPS_GLYPHS = 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf'
const PROTOMAPS_SPRITE = (theme: 'light' | 'dark') =>
  `https://protomaps.github.io/basemaps-assets/sprites/v4/${theme}`

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
// modify so we don't have to import MapLibre's enormous Style type.
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
 * Builds the MapLibre style for the given variant. Memoised per variant
 * for the page lifetime so we never re-fetch within a session.
 */
export function getResilientStyle(variant: 'positron' | 'dark'): Promise<MapStyleSpec> {
  const existing = styleCache.get(variant)
  if (existing) return existing

  const promise = (async (): Promise<MapStyleSpec> => {
    const pmtilesUrl = process.env.NEXT_PUBLIC_PMTILES_URL
    if (pmtilesUrl) {
      // PRIMARY: pmtiles + protomaps theme
      return buildProtomapsStyle(pmtilesUrl, variant)
    }
    // FALLBACK: original OpenFreeMap path
    try {
      const res = await fetch(OPENFREEMAP_STYLE_URLS[variant], { cache: 'force-cache' })
      if (!res.ok) throw new Error(`style ${res.status}`)
      const raw = (await res.json()) as MapStyleSpec
      return await inlineTileJson(raw)
    } catch {
      return emptyFallbackStyle(variant)
    }
  })()

  styleCache.set(variant, promise)
  return promise
}

/** PRIMARY mode — Protomaps theme + our self-hosted PMTiles on R2. */
function buildProtomapsStyle(pmtilesUrl: string, variant: 'positron' | 'dark'): MapStyleSpec {
  // Map our two existing variant names to Protomaps' palette names.
  // 'light' is the cleanest equivalent of OpenFreeMap's "positron";
  // 'dark' is a direct match.
  const themeName: 'light' | 'dark' = variant === 'dark' ? 'dark' : 'light'

  // v4 takes a full Theme object (palette + named colours) as 2nd arg,
  // not a string. namedTheme(name) returns the matching built-in palette.
  // The third argument carries the label language code — 'en' covers
  // Latin script; Protomaps falls back to local names where the data
  // only has the non-Latin original (most Indonesian place names ARE
  // Latin so this is a non-issue here).
  const layers = protomapsLayers(
    'protomaps',
    namedTheme(themeName),
    { lang: 'en' },
  ) as unknown as MapStyleSpec['layers']

  return {
    version: 8,
    name: 'CityRiders self-hosted (Protomaps Basemap)',
    glyphs: PROTOMAPS_GLYPHS,
    sprite: PROTOMAPS_SPRITE(themeName),
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${pmtilesUrl}`,
        attribution:
          '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>',
      },
    },
    layers,
  }
}

/** FALLBACK mode — OpenFreeMap style with its TileJSON inlined so MapLibre
 *  skips an extra round-trip on first paint. */
async function inlineTileJson(style: MapStyleSpec): Promise<MapStyleSpec> {
  const sources = { ...style.sources }
  for (const [name, sourceRaw] of Object.entries(sources)) {
    const source = { ...sourceRaw }
    if (typeof source.url === 'string' && !source.tiles) {
      try {
        const tj = await fetch(source.url, { cache: 'force-cache' }).then((r) => r.json()) as {
          tiles?: string[]
          [k: string]: unknown
        }
        if (Array.isArray(tj.tiles) && tj.tiles.length > 0) {
          source.tiles = [...tj.tiles]
          if (tj.minzoom !== undefined) source.minzoom = tj.minzoom
          if (tj.maxzoom !== undefined) source.maxzoom = tj.maxzoom
          if (tj.bounds !== undefined) source.bounds = tj.bounds
          delete source.url
        }
      } catch {
        // Resolution failed — leave source as-is; MapLibre will try.
      }
    }
    sources[name] = source
  }
  return { ...style, sources }
}
