'use client'
import { useEffect, useRef, useState } from 'react'
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl'
import { Protocol as PMTilesProtocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Info, X as XIcon } from 'lucide-react'
import type { Rider } from '@/types/rider'
import { getResilientStyle } from '@/lib/map/resilientStyle'

// Register the PMTiles protocol on MapLibre once per app lifecycle so any
// `pmtiles://...` URL in a style source resolves through the pmtiles
// reader (range-fetches an indexed single-file archive on R2 or any HTTP
// host). Idempotent: addProtocol with the same key replaces the prior
// handler, so module re-evaluation in dev HMR is safe. Pointing a tile
// source at a real pmtiles URL is opt-in — registering the protocol
// alone has no runtime cost when no source uses it.
if (typeof window !== 'undefined' && !(window as unknown as { __cr_pmtiles?: boolean }).__cr_pmtiles) {
  const protocol = new PMTilesProtocol()
  maplibregl.addProtocol('pmtiles', protocol.tile)
  ;(window as unknown as { __cr_pmtiles?: boolean }).__cr_pmtiles = true
}

// Marching-ants dash cycle for the route line. Each frame shifts the dash
// pattern so the line appears to flow from pickup → dropoff. Twelve steps
// gives a smooth loop without burning CPU on every RAF tick.
const DASH_SEQUENCE: number[][] = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5],
  [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 2.5], [0, 1, 3, 2], [0, 1.5, 3, 1.5],
  [0, 2, 3, 1], [0, 2.5, 3, 0.5],
]

type Props = {
  center: { lat: number; lng: number }
  zoom?: number
  riders?: Rider[]
  pickup?: { lat: number; lng: number } | null
  dropoff?: { lat: number; lng: number } | null
  onDropoffSet?: (c: { lat: number; lng: number }) => void
  showRoute?: boolean
  height?: string
  interactive?: boolean
  /** Map style: 'positron' light (default for trip planner), 'dark' for landing hero. */
  variant?: 'positron' | 'dark'
  /** Strip all text/icon labels — clean look for the landing background. */
  hideLabels?: boolean
  /** Auto-rotate/pan camera slowly — subtle motion for hero backgrounds. */
  autoPan?: boolean
  /** How rider markers render. 'scooter' = solid yellow w/ emoji (default).
   *  'ping' = subtle satellite pulse — used on the landing hero. */
  markerStyle?: 'scooter' | 'ping'
  /** Hide every non-road layer (water, parks, buildings) and recolour roads
   *  in brand palette — pure roads-only network look. */
  roadsOnly?: boolean
  /** Map tilt in degrees (0 = top-down, 60 = max). Adds 3D perspective —
   *  used on the trip planner for an Apple-Maps / Grab-style hero view. */
  pitch?: number
  /** Viewport padding (in px) applied to all camera moves so route + markers
   *  stay in the visible "hero" area rather than getting clipped by floating
   *  UI like a header, bottom sheet, or side rail. */
  viewportPadding?: { top?: number; bottom?: number; left?: number; right?: number }
  /** When true (and a route is shown), an orange marker is drawn at the
   *  geometric midpoint of pickup → dropoff to signal "there's a stop on
   *  the way". Free-form pit-stop notes don't have real coordinates, so
   *  the midpoint is a visual indicator rather than a real location. */
  pitStop?: boolean
}

// OpenFreeMap primary wired via getResilientStyle(). The Service Worker
// cache (Phase 1) captures successful tile fetches so subsequent loads
// are instant even offline. Last-resort: SW returns a transparent 1x1
// PNG so a broken tile renders blank instead of as a red error overlay.

// Indonesia bounding box — constrains pan so users can't accidentally
// scroll into the Pacific. Generous margin around the real coastline
// (94°E–142°E, 12°S–7°N) so cities at the edges (Sabang, Merauke) still
// have headroom for pan + zoom around their suburbs.
const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [94.0, -12.0],
  [142.0,  7.0],
]

export default function RiderMap({
  center, zoom = 13, riders = [], pickup, dropoff, onDropoffSet,
  showRoute = false, height = '320px', interactive = true,
  variant = 'dark', hideLabels = false, autoPan = false,
  markerStyle = 'scooter', roadsOnly = false, pitch = 0,
  viewportPadding, pitStop = false,
}: Props) {
  const pitStopMarkerRef = useRef<Marker | null>(null)
  const dashFrameRef = useRef<number | null>(null)
  // Latest fitBounds-for-route closure — kept in a ref so the
  // ResizeObserver in the init effect can re-fit on container resize
  // (pit-stop expand, keyboard open, orientation change) without being
  // captured to a stale pickup/dropoff/padding tuple.
  const fitRouteRef = useRef<(() => void) | null>(null)
  // Merge caller-provided padding with sane defaults. All camera moves
  // (flyTo, fitBounds) below use this so the route/markers stay in the
  // visible area when a bottom sheet or header overlays the map.
  const padding = {
    top:    viewportPadding?.top    ?? 0,
    bottom: viewportPadding?.bottom ?? 0,
    left:   viewportPadding?.left   ?? 0,
    right:  viewportPadding?.right  ?? 0,
  }
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const pickupMarkerRef = useRef<Marker | null>(null)
  const dropoffMarkerRef = useRef<Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    // Cancellation flag — getResilientStyle() resolves async; on unmount
    // before the style lands we must NOT mount the map (the container is
    // already gone). Without this guard React 18 strict-mode double-mounts
    // would race + create orphaned MapLibre instances.
    let cancelled = false
    let createdMap: MLMap | null = null
    let observer: ResizeObserver | null = null
    const containerEl = containerRef.current

    void getResilientStyle(variant).then((style) => {
      if (cancelled || !containerEl) return
      const map = new maplibregl.Map({
        container: containerEl,
        style: style as unknown as maplibregl.StyleSpecification,
        center: [center.lng, center.lat],
        zoom,
        pitch,
        // OSM ODbL legally requires credit visible on every map view.
        // We replace MapLibre's default attribution control with our own
        // tiny custom pill (see AttributionPill below) for cleaner styling
        // — the pill opens a sheet listing OSM + OpenFreeMap on tap.
        attributionControl: false,
        interactive,
        maxBounds: INDONESIA_BOUNDS,
        // Cap at 2x — high-DPR Androids (3x+) would otherwise burn battery
        // rendering at native resolution. 2x is the sharpness sweet spot.
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      })
      createdMap = map
      mapRef.current = map

      // Silence "Image 'wood-pattern' could not be loaded" warnings — the
      // OpenFreeMap dark style references sprite patterns (wood, sand, etc.)
      // we don't load. Substitute a 1×1 transparent placeholder so the
      // (already-hidden) fill layers don't spam the console.
      map.on('styleimagemissing', (e) => {
        if (!map.hasImage(e.id)) {
          map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) })
        }
      })

      map.on('load', () => {
        try {
          const layers = map.getStyle().layers
          if (!layers) return
          for (const layer of layers) {
            // Force a deep-black background regardless of style
            if (layer.type === 'background') {
              map.setPaintProperty(layer.id, 'background-color', '#0A0A0A')
              continue
            }
            // Strip text + POI labels for a clean hero look
            if (hideLabels && layer.type === 'symbol') {
              map.setLayoutProperty(layer.id, 'visibility', 'none')
              continue
            }
            // Roads-only mode: hide everything that isn't a transportation line,
            // then recolour roads in brand palette.
            if (roadsOnly) {
              const srcLayer = (layer as { 'source-layer'?: string })['source-layer']
              const isTransport = srcLayer === 'transportation' || /road|highway|bridge|tunnel|transport/i.test(layer.id)
              if (!isTransport) {
                map.setLayoutProperty(layer.id, 'visibility', 'none')
                continue
              }
              // Style transportation lines: primary roads brand yellow, others dim
              if (layer.type === 'line') {
                const isPrimary = /motorway|trunk|primary/i.test(layer.id)
                const isSecondary = /secondary|tertiary/i.test(layer.id)
                map.setPaintProperty(
                  layer.id,
                  'line-color',
                  isPrimary ? '#FACC15' : isSecondary ? 'rgba(250,204,21,0.55)' : 'rgba(255,255,255,0.18)',
                )
                map.setPaintProperty(
                  layer.id,
                  'line-width',
                  isPrimary
                    ? ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 4]
                    : ['interpolate', ['linear'], ['zoom'], 10, 0.6, 16, 2],
                )
                map.setPaintProperty(layer.id, 'line-opacity', isPrimary ? 0.95 : 0.75)
              }
            }
          }
        } catch { /* style not fully loaded — ignore */ }

        // Force a resize once styles + container are settled. Without this,
        // the map can render at the container's initial (pre-layout) dimensions
        // — tiles look stretched/cropped until the user interacts.
        map.resize()
        requestAnimationFrame(() => map.resize())
        setTimeout(() => map.resize(), 300)

        // Subtle hero camera animation — slow clockwise pan, restart on every load
        if (autoPan) {
          let bearing = 0
          const start = performance.now()
          const tick = (now: number) => {
            if (!mapRef.current) return
            const elapsed = (now - start) / 1000
            bearing = (elapsed * 1.5) % 360 // 1.5°/sec → full rotation in 4 min
            mapRef.current.setBearing(bearing)
            requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      })

      if (onDropoffSet) {
        map.on('click', (e) => {
          onDropoffSet({ lat: e.lngLat.lat, lng: e.lngLat.lng })
        })
      }

      // Observe container size changes — mobile URL bar toggle, parent
      // layout changes (bottom sheet expand, keyboard), image-loaded
      // shifts. Each change resizes the map AND re-fits the route so it
      // stays in the now-visible hero band.
      observer = new ResizeObserver(() => {
        mapRef.current?.resize()
        fitRouteRef.current?.()
      })
      observer.observe(containerEl)
    })

    return () => {
      cancelled = true
      observer?.disconnect()
      if (createdMap) {
        createdMap.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update center when prop changes — pass viewport padding so the
  // map's "true centre" lands in the visible area (not behind chrome
  // like a bottom sheet). Maplibre interprets padding as an inset
  // from the map container edges.
  //
  // When a route is active, the route effect owns the camera via
  // fitBounds — skip flyTo here so the two camera moves don't fight.
  useEffect(() => {
    if (!mapRef.current) return
    if (showRoute && pickup && dropoff) return
    mapRef.current.flyTo({
      center: [center.lng, center.lat],
      zoom,
      duration: 600,
      padding,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom])

  // Apply viewport padding to the map's default camera. Updates when
  // the caller changes padding (e.g. sheet expand/collapse). When
  // there is no active route, we also re-fly to the current centre so
  // the visible pin lands in the unobstructed band even if the chrome
  // height was still settling at the moment of the initial flyTo
  // (e.g. pickup card measured AFTER first paint). With an active
  // route, the route effect owns the camera — skip the re-fly to
  // avoid camera fights.
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setPadding(padding)
    if (!(showRoute && pickup && dropoff)) {
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom,
        duration: 350,
        padding,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padding.top, padding.bottom, padding.left, padding.right])

  // React to pitch changes after init — caller can flatten the camera
  // (e.g. to 0 when a route is drawn so fitBounds is exact, no 3D skew).
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.easeTo({ pitch, duration: 500 })
  }, [pitch])

  // Cluster threshold — above this rider count we switch to GeoJSON
  // cluster layers (native maplibre) which scale to tens of thousands
  // of points. Below it we keep the HTML scooter/ping markers which
  // look nicer and are fine for small lists.
  const CLUSTER_THRESHOLD = 30

  // Render rider markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear any previous HTML markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Helper to safely remove the cluster source + its layers between
    // runs (e.g. rider list changes from clustered to non-clustered).
    const clearClusterLayers = () => {
      ['riders-cluster-count', 'riders-cluster-bg', 'riders-unclustered'].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id)
      })
      if (map.getSource('riders')) map.removeSource('riders')
    }

    if (riders.length >= CLUSTER_THRESHOLD && markerStyle === 'scooter') {
      // GeoJSON-clustered path — kicks in when we're rendering many
      // riders in one viewport (post-scale rollout). Clusters appear as
      // brand-yellow circles with the rider count; individual riders
      // appear as a smaller circle at high zoom.
      const setup = () => {
        clearClusterLayers()
        map.addSource('riders', {
          type: 'geojson',
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
          data: {
            type: 'FeatureCollection',
            features: riders.map((r) => ({
              type: 'Feature' as const,
              properties: { isOnline: r.isOnline ? 1 : 0 },
              geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
            })),
          },
        })
        map.addLayer({
          id: 'riders-cluster-bg',
          type: 'circle',
          source: 'riders',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#FACC15',
            'circle-radius': [
              'step', ['get', 'point_count'],
              16, 10, 22, 50, 28, 200, 34,
            ],
            'circle-stroke-color': '#0A0A0A',
            'circle-stroke-width': 3,
            'circle-opacity': 0.92,
          },
        })
        map.addLayer({
          id: 'riders-cluster-count',
          type: 'symbol',
          source: 'riders',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 13,
            'text-font': ['Noto Sans Bold', 'Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-allow-overlap': true,
          },
          paint: { 'text-color': '#0A0A0A' },
        })
        map.addLayer({
          id: 'riders-unclustered',
          type: 'circle',
          source: 'riders',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['case', ['==', ['get', 'isOnline'], 1], '#FACC15', '#64748B'],
            'circle-radius': 7,
            'circle-stroke-color': '#0A0A0A',
            'circle-stroke-width': 2,
          },
        })

        // Click a cluster → zoom into it.
        map.on('click', 'riders-cluster-bg', (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['riders-cluster-bg'],
          })
          const clusterId = features[0]?.properties?.cluster_id
          const src = map.getSource('riders') as maplibregl.GeoJSONSource | undefined
          if (clusterId == null || !src) return
          src.getClusterExpansionZoom(clusterId).then((zoomNext) => {
            const geom = features[0].geometry
            if (geom.type !== 'Point') return
            map.easeTo({
              center: geom.coordinates as [number, number],
              zoom: zoomNext,
              duration: 500,
            })
          })
        })
      }
      if (map.isStyleLoaded()) setup()
      else map.once('load', setup)
      return () => {
        try { clearClusterLayers() } catch { /* style gone */ }
      }
    }

    // HTML marker path — keeps the existing scooter / ping styling for
    // small marker counts (the typical case in production today).
    clearClusterLayers()
    riders.forEach((r, i) => {
      const el = document.createElement('div')
      if (markerStyle === 'ping') {
        // Staggered, deterministic delay so pings don't strobe in sync
        const delay = -((i * 0.47) % 2.6).toFixed(2) + 's'
        el.innerHTML = `
          <div style="position: relative; width: 12px; height: 12px;">
            <div style="
              position: absolute; left: 50%; top: 50%;
              width: 12px; height: 12px;
              transform: translate(-50%, -50%);
              border-radius: 50%;
              background: rgba(250,204,21,0.55);
              animation: ridePing 2.6s ease-out infinite;
              animation-delay: ${delay};
            "></div>
            <div style="
              position: absolute; left: 50%; top: 50%;
              width: 8px; height: 8px;
              transform: translate(-50%, -50%);
              border-radius: 50%;
              background: #FACC15;
              box-shadow: 0 0 8px rgba(250,204,21,0.85), 0 0 2px rgba(250,204,21,1);
              z-index: 2;
            "></div>
          </div>
        `
      } else {
        // Default scooter marker — used in the trip planner / profile pages
        el.innerHTML = `
          <div style="position: relative; transform: translateY(-50%);">
            <div style="
              width: 36px; height: 36px; border-radius: 18px;
              background: ${r.isOnline ? '#FACC15' : '#64748B'};
              border: 3px solid #0A0A0A;
              display: flex; align-items: center; justify-content: center;
              font-size: 18px; line-height: 1;
              box-shadow: 0 0 ${r.isOnline ? '14px' : '4px'} rgba(${r.isOnline ? '250,204,21' : '0,0,0'},${r.isOnline ? '0.65' : '0.5'});
            ">🛵</div>
          </div>
        `
      }
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([r.lng, r.lat])
        .addTo(mapRef.current!)
      markersRef.current.push(m)
    })
  }, [riders, markerStyle])

  // Render pickup marker — green square so the customer sees their
  // pickup take effect on the map the moment they set it.
  useEffect(() => {
    if (!mapRef.current) return
    if (pickupMarkerRef.current) { pickupMarkerRef.current.remove(); pickupMarkerRef.current = null }
    if (!pickup) return
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="
        width: 18px; height: 18px; border-radius: 4px;
        background: #22C55E; border: 3px solid #0A0A0A;
        box-shadow: 0 0 14px rgba(34,197,94,0.85);
      "></div>
    `
    pickupMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([pickup.lng, pickup.lat])
      .addTo(mapRef.current)
  }, [pickup])

  // Render dropoff marker — red circle. Distinct shape AND colour from
  // the green pickup square so the trip ends read unambiguously.
  useEffect(() => {
    if (!mapRef.current) return
    if (dropoffMarkerRef.current) { dropoffMarkerRef.current.remove(); dropoffMarkerRef.current = null }
    if (!dropoff) return
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="
        width: 18px; height: 18px; border-radius: 50%;
        background: #DC2626; border: 3px solid #0A0A0A;
        box-shadow: 0 0 14px rgba(220,38,38,0.85);
      "></div>
    `
    dropoffMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([dropoff.lng, dropoff.lat])
      .addTo(mapRef.current)
  }, [dropoff])

  // Pit-stop marker — orange pulsing dot at the geometric midpoint of
  // pickup → dropoff. Free-form pit-stop notes don't have real coords,
  // so this midpoint serves as a visual "there's a stop on the way"
  // indicator rather than the literal stop location.
  useEffect(() => {
    if (!mapRef.current) return
    if (pitStopMarkerRef.current) { pitStopMarkerRef.current.remove(); pitStopMarkerRef.current = null }
    if (!pitStop || !pickup || !dropoff) return
    const midLat = (pickup.lat + dropoff.lat) / 2
    const midLng = (pickup.lng + dropoff.lng) / 2
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="position: relative; width: 20px; height: 20px;">
        <div style="
          position: absolute; left: 50%; top: 50%;
          width: 20px; height: 20px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: rgba(249,115,22,0.45);
          animation: ridePing 2.4s ease-out infinite;
        "></div>
        <div style="
          position: absolute; left: 50%; top: 50%;
          width: 14px; height: 14px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: #F97316;
          border: 2px solid #0A0A0A;
          box-shadow: 0 0 10px rgba(249,115,22,0.85);
        "></div>
      </div>
    `
    pitStopMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([midLng, midLat])
      .addTo(mapRef.current)
  }, [pitStop, pickup, dropoff])

  // Route line between pickup and dropoff — two stacked layers:
  //   route-glow: soft wide green halo (continuity readability)
  //   route-line: thin animated dashed foreground (marching ants)
  // Re-runs on padding change too, so expanding the bottom sheet, opening
  // the keyboard, or rotating the device re-fits the route into the
  // newly-visible hero area.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const clearRoute = () => {
      if (dashFrameRef.current != null) {
        cancelAnimationFrame(dashFrameRef.current)
        dashFrameRef.current = null
      }
      if (map.getLayer('route-line')) map.removeLayer('route-line')
      if (map.getLayer('route-glow')) map.removeLayer('route-glow')
      if (map.getSource('route')) map.removeSource('route')
    }

    const fitRouteBounds = () => {
      if (!pickup || !dropoff) return
      map.resize()
      const bounds = new maplibregl.LngLatBounds()
      bounds.extend([pickup.lng, pickup.lat])
      bounds.extend([dropoff.lng, dropoff.lat])
      // The map container IS the visible hero band (page sizes it to
      // fit between the header and the bottom stack), so padding here
      // is just edge clearance — markers shouldn't sit flush against
      // the container boundary.
      map.fitBounds(bounds, {
        padding: {
          top:    padding.top,
          bottom: padding.bottom,
          left:   padding.left,
          right:  padding.right,
        },
        maxZoom: 15,
        duration: 700,
      })
    }
    // Expose the latest fitRouteBounds to the ResizeObserver in the
    // init effect so container-size changes re-frame the route too.
    fitRouteRef.current = fitRouteBounds

    const setupRoute = () => {
      if (!showRoute || !pickup || !dropoff) {
        clearRoute()
        return
      }
      const data = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: [[pickup.lng, pickup.lat], [dropoff.lng, dropoff.lat]],
        },
      }
      if (map.getSource('route')) {
        ;(map.getSource('route') as maplibregl.GeoJSONSource).setData(data)
      } else {
        map.addSource('route', { type: 'geojson', data })
        // Soft underline glow — keeps the line readable as a continuous
        // path even while the dashed foreground breaks visually.
        map.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#22C55E',
            'line-width': 10,
            'line-opacity': 0.18,
            'line-blur': 4,
          },
        })
        // Dashed animated foreground — marching ants from pickup → dropoff.
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: {
            'line-color': '#22C55E',
            'line-width': 4,
            'line-opacity': 0.95,
            'line-dasharray': DASH_SEQUENCE[0],
          },
        })

        // RAF dash cycle — throttled to ~16fps so the marching effect is
        // smooth but doesn't redraw the whole map on every frame.
        let step = 0
        let last = 0
        const tick = (t: number) => {
          if (!mapRef.current) return
          if (t - last > 60) {
            step = (step + 1) % DASH_SEQUENCE.length
            if (mapRef.current.getLayer('route-line')) {
              mapRef.current.setPaintProperty(
                'route-line',
                'line-dasharray',
                DASH_SEQUENCE[step],
              )
            }
            last = t
          }
          dashFrameRef.current = requestAnimationFrame(tick)
        }
        dashFrameRef.current = requestAnimationFrame(tick)
      }
      fitRouteBounds()
    }

    if (map.isStyleLoaded()) setupRoute()
    else map.once('load', setupRoute)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickup?.lat, pickup?.lng,
    dropoff?.lat, dropoff?.lng,
    showRoute,
    padding.top, padding.bottom, padding.left, padding.right,
  ])

  // Cancel the dash RAF on unmount so it doesn't outlive the map.
  useEffect(() => () => {
    if (dashFrameRef.current != null) cancelAnimationFrame(dashFrameRef.current)
  }, [])

  return (
    <div
      style={{ height, width: '100%', overflow: 'hidden', position: 'relative' }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <AttributionPill />
    </div>
  )
}

// ============================================================================
// AttributionPill — tiny "ⓘ" button in the bottom-right corner that opens
// a small sheet listing the map attributions. Replaces MapLibre's default
// AttributionControl so we get full styling control while still meeting
// the ODbL "© OpenStreetMap contributors" requirement.
//
// Why a custom button: MapLibre's compact attribution shows as a visible
// text pill on wider viewports. We want a single ~26px icon at all sizes,
// matching the rest of the app's dark glass aesthetic.
//
// pointer-events: auto is explicit because some parents (the global
// MapBackground at the root layout) set pointer-events: none on the map
// wrapper to keep clicks passing through to UI underneath. The pill
// itself must stay tappable regardless.
// ============================================================================
function AttributionPill() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label="Map attributions"
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          width: 26,
          height: 26,
          borderRadius: 999,
          background: 'rgba(10,10,10,0.6)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
      >
        <Info size={14} strokeWidth={2.25} />
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              pointerEvents: 'auto',
              zIndex: 1,
            }}
          />
          <div
            role="dialog"
            aria-label="Map attributions"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 44,
              right: 8,
              maxWidth: 260,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(15,15,20,0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.92)',
              fontSize: 12,
              lineHeight: 1.5,
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              pointerEvents: 'auto',
              zIndex: 2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
                Map credits
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  width: 22, height: 22, borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <XIcon size={12} strokeWidth={2.5} />
              </button>
            </div>
            <div>
              Data ©{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#FACC15', textDecoration: 'underline' }}
              >
                OpenStreetMap contributors
              </a>
            </div>
            <div style={{ marginTop: 4 }}>
              Tiles ©{' '}
              <a
                href="https://openfreemap.org"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#FACC15', textDecoration: 'underline' }}
              >
                OpenFreeMap
              </a>
            </div>
          </div>
        </>
      )}
    </>
  )
}
