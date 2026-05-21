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

const TILE_CACHE = 'cr-tiles-v2-r2'
const APP_SHELL_CACHE = 'cr-app-shell-v3'
const OFFLINE_FALLBACK_URL = '/offline.html'

// Cross-origin assets that offline.html depends on. Precached as opaque
// (no-cors) so the offline shell renders branded even when the network is
// gone. The fetch handler matches these URLs against APP_SHELL_CACHE on
// failure so img tags inside offline.html can read them.
const OFFLINE_DEPENDENCIES = [
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2008_23_29%20PM.png?updatedAt=1779197024231&tr=f-auto,q-75,w-1200',
  'https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714',
]

// 1500 vector tiles ≈ 30-50 MB depending on density. Tunable; if we see
// quota errors in production we can shrink. Browser typically allows
// 50-200 MB of total Cache API storage before pressuring eviction.
const TILE_LIMIT = 1500

// Hosts whose responses are eligible for the tile cache. Add new providers
// here as Phase 2 (multi-origin failover) and Phase 3 (bundled packs)
// land. The host MUST match exactly — no wildcards, no protocol.
const TILE_HOSTS = new Set([
  'tiles.openfreemap.org',
  'tile.openstreetmap.org',
])

// Suffix match used in addition to TILE_HOSTS — covers the self-hosted
// PMTiles on Cloudflare R2 (any *.r2.dev subdomain) without needing to
// hard-code the bucket-specific subdomain. PMTiles fetches go to ONE
// URL with different Range headers; the underlying fetch handler caches
// each unique request URL+range pair as a separate Cache API entry, so
// this still benefits from offline behavior even with a single archive.
const TILE_HOST_SUFFIXES = ['.r2.dev']

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
  if (TILE_HOSTS.has(url.hostname)) return true
  for (const suffix of TILE_HOST_SUFFIXES) {
    if (url.hostname.endsWith(suffix)) return true
  }
  return false
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Pre-cache the offline-fallback shell so navigations during a
      // network outage (Vercel down, no signal, Play review without
      // network) get a branded page instead of the browser's default
      // dinosaur. Best-effort — never block install on this fetch.
      try {
        const cache = await caches.open(APP_SHELL_CACHE)
        // allSettled — cross-origin precache is best-effort; one CDN miss
        // must not strand the offline shell.
        await Promise.allSettled([
          cache.add(new Request(OFFLINE_FALLBACK_URL, { cache: 'reload' })),
          ...OFFLINE_DEPENDENCIES.map((u) =>
            cache.add(new Request(u, { mode: 'no-cors', cache: 'reload' })),
          ),
        ])
      } catch { /* ignore — runtime fetch will retry */ }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop stale cache versions (cr-tiles-vX where X !== current, and
      // older app-shell versions).
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((n) =>
            (n.startsWith('cr-tiles-') && n !== TILE_CACHE) ||
            (n.startsWith('cr-app-shell-') && n !== APP_SHELL_CACHE),
          )
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

  // Navigation fallback — when the user navigates to any page and the
  // network is unreachable, serve the offline shell instead of the
  // browser's default error. Same-origin only, no API routes.
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigation(event.request))
    return
  }

  // Parse the URL lazily — most requests aren't tile requests so we
  // don't want to pay the URL-parse cost for every fetch.
  let url
  try {
    url = new URL(event.request.url)
  } catch {
    return
  }

  // Offline-page dependencies — cache-first so img tags inside offline.html
  // render branded even when the network is gone.
  if (OFFLINE_DEPENDENCIES.includes(url.href)) {
    event.respondWith(handleOfflineDependency(event.request))
    return
  }

  if (!isTileRequest(url)) return

  event.respondWith(handleTileRequest(event.request))
})

async function handleOfflineDependency(request) {
  const cache = await caches.open(APP_SHELL_CACHE)
  const cached = await cache.match(request, { ignoreSearch: false, ignoreVary: true })
  if (cached) return cached
  try {
    const fresh = await fetch(request, { mode: 'no-cors' })
    if (fresh) cache.put(request, fresh.clone()).catch(() => {})
    return fresh
  } catch {
    return Response.error()
  }
}

async function handleNavigation(request) {
  try {
    // Always try the network first — we want fresh app shells on every
    // visit; offline shell is purely a last-resort.
    return await fetch(request)
  } catch {
    const cache = await caches.open(APP_SHELL_CACHE)
    const cached = await cache.match(OFFLINE_FALLBACK_URL)
    if (cached) return cached
    // Cache miss too (first visit, SW not pre-cached yet) — return a
    // minimal inline page so the user still sees something branded.
    return new Response(
      '<!doctype html><meta charset=utf-8><title>City Rider — Offline</title>' +
      '<body style="background:#0A0A0A;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center"><div>' +
      '<h1 style="font-size:20px;font-weight:900;margin:0 0 8px">Tidak ada koneksi</h1>' +
      '<p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0 0 16px">Periksa sinyal lalu coba lagi.</p>' +
      '<button onclick="location.reload()" style="background:linear-gradient(135deg,#FACC15,#EAB308);color:#0A0A0A;border:1px solid #000;border-radius:16px;padding:12px 18px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;cursor:pointer">Coba lagi</button>' +
      '</div></body>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}

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
