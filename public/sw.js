// ============================================================================
// City Rider — Service Worker.
// ----------------------------------------------------------------------------
// Two jobs:
//   1. Satisfy Chrome's "Add to Home Screen" PWA-install criterion via a
//      registered `fetch` listener.
//   2. Provide a durable offline tile + map-asset cache for Indonesia-grade
//      mobile networks where the radio drops constantly.
//
// STRATEGY (tiles + map assets):
//   • Cache-first with stale-while-revalidate background refresh
//   • Cap the cache at TILE_LIMIT entries (~30-50 MB on disk in practice)
//   • Evict oldest entries when over limit — Cache API preserves insertion
//     order on keys(), so we delete from the front
//   • If both cache and network fail, return a transparent 1x1 PNG so the
//     map never shows MapLibre's red error tile
//
// STRATEGY (everything else):
//   • Pass-through to the browser — no caching, no interception
//   • Next.js already serves immutable hashed chunks with long Cache-Control,
//     so HTTP cache + browser cache do the right thing
//
// CACHE VERSIONING:
//   • Bump TILE_CACHE to invalidate every device's cached tiles after a
//     style or layer change — the activate handler deletes any cr-tiles-*
//     cache whose name doesn't match the current version
// ============================================================================

const TILE_CACHE = 'cr-tiles-v1'

// 1500 vector tiles ≈ 30-50 MB depending on density. Tunable; if we see
// quota errors in production we can shrink. Browser typically allows
// 50-200 MB of total Cache API storage before pressuring eviction.
const TILE_LIMIT = 1500

// Hosts whose responses are eligible for the tile cache. Add new providers
// here as Phase 2 (multi-origin failover) and Phase 3 (bundled packs)
// land. The host MUST match exactly — no wildcards, no protocol.
const TILE_HOSTS = new Set([
  'tiles.openfreemap.org',
  'tiles.stadiamaps.com',
  'api.stadiamaps.com',
  'tile.openstreetmap.org',
])

// 1x1 transparent PNG. Used as the last-resort response when network and
// cache both fail — MapLibre treats this as a successfully-loaded blank
// tile (no red error overlay).
const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

function base64ToUint8Array(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function transparentPngResponse() {
  return new Response(base64ToUint8Array(TRANSPARENT_PNG_BASE64), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      // Mark so we don't accidentally re-cache the fallback as if it were
      // a real tile (handleTileRequest checks this header below).
      'X-CR-Fallback': '1',
    },
  })
}

function isTileRequest(url) {
  return TILE_HOSTS.has(url.hostname)
}

self.addEventListener('install', (event) => {
  // Activate the new SW immediately — don't wait for tabs to close.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop stale cache versions (cr-tiles-vX where X !== current).
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((n) => n.startsWith('cr-tiles-') && n !== TILE_CACHE)
          .map((n) => caches.delete(n)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  // Only GETs are cacheable; let everything else fall through to the
  // network unmodified.
  if (event.request.method !== 'GET') return

  // Parse the URL lazily — most requests aren't tile requests so we
  // don't want to pay the URL-parse cost for every fetch.
  let url
  try {
    url = new URL(event.request.url)
  } catch {
    return
  }
  if (!isTileRequest(url)) return

  event.respondWith(handleTileRequest(event.request))
})

async function handleTileRequest(request) {
  const cache = await caches.open(TILE_CACHE)
  const cached = await cache.match(request)

  if (cached) {
    // Stale-while-revalidate — kick off a background refresh that
    // refreshes the cache entry but does NOT block the response.
    // Limited concurrency: only refresh ~20% of the time so we don't
    // hammer the tile server when a user pans across a cached area.
    if (Math.random() < 0.2) {
      void refreshTile(cache, request)
    }
    return cached
  }

  // Cache miss — fetch from network, cache the result.
  try {
    const response = await fetch(request)
    // Successful responses + opaque CDN responses get cached. We DON'T
    // cache 4xx/5xx — those indicate the tile is genuinely missing or
    // the server is having a bad day; we'd rather retry next time.
    if (response && (response.ok || response.type === 'opaque')) {
      // Skip caching our own fallback in the rare case it's returned
      // by an intermediary.
      if (!response.headers.get('X-CR-Fallback')) {
        // Clone before any consumer touches the body. Then fire-and-
        // forget enforce-quota — we don't want to block the user-visible
        // response on cache housekeeping.
        const toStore = response.clone()
        void cache.put(request, toStore).then(() => enforceQuota(cache)).catch(() => {})
      }
    }
    return response
  } catch {
    // Network failure AND no cache entry. Return a transparent tile so
    // MapLibre treats it as success and the user sees a clean blank
    // rather than a red error overlay. Better UX in low-signal areas.
    return transparentPngResponse()
  }
}

async function refreshTile(cache, request) {
  try {
    const fresh = await fetch(request)
    if (fresh && (fresh.ok || fresh.type === 'opaque')) {
      if (!fresh.headers.get('X-CR-Fallback')) {
        await cache.put(request, fresh.clone())
      }
    }
  } catch {
    /* network blip — keep the stale entry, user never sees it */
  }
}

async function enforceQuota(cache) {
  const keys = await cache.keys()
  if (keys.length <= TILE_LIMIT) return
  // Evict the oldest 100 entries beyond the limit so we don't run
  // eviction on every single insert. Cache API preserves insertion
  // order on keys() — index 0 is the oldest entry.
  const overflow = keys.length - TILE_LIMIT + 100
  for (let i = 0; i < overflow; i++) {
    await cache.delete(keys[i])
  }
}
