// ============================================================================
// City Rider — minimal Service Worker for PWA install eligibility.
// ----------------------------------------------------------------------------
// Chrome's "Add to Home Screen" prompt requires a service worker with a
// `fetch` event handler registered. The listener can be a no-op — its
// existence is what counts. We do NOT call `event.respondWith` because
// then any network failure (route change cancellation, offline, etc.)
// would log "FetchEvent resulted in a network error response" in the
// console and there is no benefit to intercepting — the browser handles
// requests natively just fine.
//
// Why no caching: cityrider is a live marketplace + GPS ping loop. A
// blanket cache would serve stale driver listings. Next.js already
// emits immutable hashed assets with long Cache-Control headers, so we
// get aggressive HTTP caching without owning a cache strategy here.
// ============================================================================

self.addEventListener('install', (event) => {
  // Activate immediately on first install. No assets to pre-cache.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  // Take control of all open clients on first activation so the freshly
  // installed SW handles their requests without needing a reload.
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Intentionally empty. Browser handles all requests natively. The
  // existence of this listener is what satisfies Chrome's PWA-install
  // criterion — calling `event.respondWith(fetch(...))` would only
  // surface harmless network blips as scary console errors.
})
