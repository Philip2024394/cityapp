# Tile Resilience — How City Rider survives bad Indonesian signal

Three layers, each compounding on the previous, that keep the map alive
through network drops, tile-server outages, and first-time visits to
new cities.

## Layer 1 — Service Worker tile cache

**File:** `public/sw.js`

Every tile the user has ever loaded is cached in a dedicated SW cache
(`cr-tiles-v1`). Strategy:

- **Cache-first** — if the tile is in cache, return it instantly
- **Stale-while-revalidate** — ~20% of cache hits trigger a background
  refresh so the cache slowly stays current without hammering the server
- **LRU eviction** — capped at 1,500 tiles (~30–50 MB); oldest entries
  evicted when over limit
- **Network failure** — returns a transparent 1×1 PNG so MapLibre never
  shows a red error tile

**Coverage:** repeat users in their home area get instant tiles even
with zero signal. New users on a fresh install still need internet for
first paint.

## Layer 2 — Multi-origin failover

**File:** `src/lib/map/resilientStyle.ts`

The MapLibre style is patched at load time so every vector tile source
has **two** tile URLs:

1. **OpenFreeMap** (primary, free, no API key) — `tiles.openfreemap.org`
2. **Stadia Maps** (backup, 200k req/month free) — `tiles.stadiamaps.com`

Both serve the OpenMapTiles schema so the layer definitions render
correctly against either. When OpenFreeMap times out or 5xx's, MapLibre
transparently retries against Stadia. The SW then caches whichever
succeeded so the failure path is paid once per tile.

**Coverage:** transparent tile-server outage immunity.

## Layer 3 — Pre-warming the cache for major cities

**Files:** `src/lib/map/preloadTiles.ts` + `src/components/pwa/PreloadTiles.tsx`

On every fresh session, the app:

1. Waits for window `load`
2. Schedules a low-priority pre-warm via `requestIdleCallback`
3. Geo-detects (low-accuracy, fast) the user's nearest major city
4. Walks that city's bounding box at zoom 10–14
5. Fires fetch() for each tile (typically 300–700 per city)
6. The SW catches the responses and caches them

Cities covered out of the box (defined in `preloadTiles.ts`):

- Yogyakarta · Denpasar · Ubud · Canggu (Bali)
- Jakarta · Bandung · Surabaya · Malang
- Medan · Solo

**Coverage:** first-time-in-city users get a working map immediately
even on flaky signal. Per city: ~15–25 MB. Cumulative cache cap of
1,500 tiles means the SW evicts older cities when the user roams.

**Save-Data + 2G respect:** if the user has Save-Data enabled or is on
2G / slow-2G, the pre-warm skips entirely — Indonesian prepaid users
care about MB used, and respecting the signal matters more than
preloaded tiles.

## Layer 4 (future, not yet shipped) — Bundled PMTiles in Android APK

For maximum reliability on the Capacitor Android wrapper, a single
PMTiles file containing city-level coverage could ship inside the APK
at `android/app/src/main/assets/tiles/cities.pmtiles`.

### How to add it later

1. **Download Indonesia regional vector tiles as PMTiles:**
   ```
   curl -O https://download.openfreemap.org/pmtiles/area/indonesia.pmtiles
   ```
   (Or generate a custom subset with `planetiler`.)

2. **Slice to a city subset with `pmtiles extract`:**
   ```
   pmtiles extract indonesia.pmtiles cities-overview.pmtiles \
     --bbox=94.0,-12.0,142.0,7.0 \
     --maxzoom=12
   ```
   This caps the file at city-overview detail to keep the APK lean.

3. **Drop the file into Capacitor assets:**
   `android/app/src/main/assets/tiles/cities-overview.pmtiles`

4. **Register the PMTiles protocol with MapLibre** (requires installing
   the `pmtiles` npm package and adding `protomaps.addProtocol(maplibregl)`
   in `src/lib/map/resilientStyle.ts`).

5. **Add a `pmtiles://...` source to the style** with higher priority
   than the network sources.

The infrastructure for this (the resilient-style patcher) is already
in place; only the protocol registration + asset bundling need adding.
APK size impact: ~30–50 MB for city-overview coverage.

## What can still fail (the honest 1%)

- New user, first time in our app, in a city NOT in `PRELOAD_CITIES`,
  on a road we don't have cached, with zero signal → blank tile area
  at street zoom. Mitigations: add the city to `PRELOAD_CITIES`, or
  ship Layer 4.
- User runs the app in private/incognito mode → no SW cache persists
  across sessions. Acceptable: that's user-chosen behaviour.
- User clears site data → cache gone. Acceptable: same user choice.

For the realistic remaining 99% of scenarios (network blips, weak signal,
tile-server outages, urban dead zones) we have full coverage.

## Operational notes

- **Bumping the tile cache version:** edit `TILE_CACHE = 'cr-tiles-v1'`
  in `public/sw.js` to invalidate everyone's local cache on style changes.
- **Adding a city to pre-warm:** append a `CityBbox` entry to
  `PRELOAD_CITIES` in `preloadTiles.ts`. Bounding boxes are
  `[west, south, east, north]` in degrees.
- **Disabling pre-warm temporarily:** comment out `<PreloadTiles />` in
  `src/app/layout.tsx`. SW cache + multi-origin failover continue to work.
