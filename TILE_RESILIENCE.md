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

## Layer 2 — Self-hosted PMTiles on Cloudflare R2 (shipped)

**File:** `src/lib/map/resilientStyle.ts`
**Env var:** `NEXT_PUBLIC_PMTILES_URL`

When `NEXT_PUBLIC_PMTILES_URL` is set, every vector tile source in the
loaded style has its origin swapped to a single self-hosted PMTiles
archive on Cloudflare R2. Layer rules reference sources by name, so as
long as the underlying schema matches OpenMapTiles (both Protomaps
Basemap and OpenFreeMap do), every painted layer keeps rendering with
zero style changes.

**What this gives us:**

1. **Zero third-party tile providers in the hot path.** All tile bytes
   come from R2 (your storage, your CDN). OpenFreeMap is still the
   source of the style JSON + glyphs + sprite, but those are small
   static assets loaded once per session and cached forever.
2. **Range-fetched single file.** PMTiles is a single indexed archive;
   MapLibre + the `pmtiles` npm package issue HTTP Range requests
   against it, fetching only the bytes for visible tiles.
3. **Cloudflare edge cache.** R2 sits behind Cloudflare's global edge
   network — Indonesian users typically hit the Singapore POP.
4. **$0 ongoing cost at our scale.** R2 free tier covers 10 GB storage
   + unlimited egress + 10M Class B reads/mo. The 2.2 GB Indonesia
   archive fits comfortably; even thousands of daily users stay free.

**Falling back if env var is unset:** the resolver inlines OpenFreeMap's
TileJSON into `source.tiles[]` and uses tiles.openfreemap.org as the
provider. Dev environments without `NEXT_PUBLIC_PMTILES_URL` still work.

**How to (re)generate the PMTiles archive:**

```
# 1. Verify a recent build exists (Protomaps publishes daily)
curl -sI https://build.protomaps.com/YYYYMMDD.pmtiles | head -1

# 2. Extract Indonesia bbox via range-fetch (no full planet download)
pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles \
  indonesia.pmtiles --bbox=95,-11,142,6

# 3. Upload to R2 via rclone (wrangler caps at 300 MB, dashboard too)
rclone copyto indonesia.pmtiles r2:<bucket>/indonesia.pmtiles \
  --s3-no-check-bucket --s3-chunk-size=64M --s3-upload-concurrency=4

# 4. Enable r2.dev subdomain or attach a custom domain to the bucket
# 5. Set NEXT_PUBLIC_PMTILES_URL=https://pub-xxx.r2.dev/indonesia.pmtiles
```

Refresh cadence: OSM data is community-edited daily; re-running the
extract every 1–3 months keeps the map current. Same command, swap the
date in step 2.

**Coverage:** end-to-end ownership of vector tile delivery for Indonesia.

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

For true offline support on the Capacitor Android wrapper, a CITY-LEVEL
PMTiles subset (z0–12 only, ~30–50 MB) could ship inside the APK itself
at `android/app/src/main/assets/tiles/cities-overview.pmtiles`.

Difference from Layer 2: that one is the full-detail (z0–15) Indonesia
archive on R2; this one would be a small city-overview subset bundled
in the binary so the map works with literally no internet on first
launch — useful for tourists who land at the airport with no SIM.

### How to add it later

1. Pull the same Indonesia extract used by Layer 2 (already produced by
   the `pmtiles extract` step documented above).

2. Slice further to city-overview only:
   ```
   pmtiles extract indonesia.pmtiles cities-overview.pmtiles --maxzoom=12
   ```

3. Drop into Capacitor assets:
   `android/app/src/main/assets/tiles/cities-overview.pmtiles`

4. In `resilientStyle.ts`, point at the bundled file (Capacitor exposes
   it as `capacitor://localhost/_capacitor_file_/.../cities-overview.pmtiles`).

The `pmtiles` npm package and protocol registration (in `RiderMap.tsx`)
are already in place from Layer 2 — only the bundling step needs adding.

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
