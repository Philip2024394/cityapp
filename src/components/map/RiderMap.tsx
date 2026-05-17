'use client'
import { useEffect, useRef } from 'react'
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Rider } from '@/types/rider'

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

// OpenFreeMap — community-run vector tiles, OSM data, no API key required.
const OPENFREEMAP_STYLES = {
  positron: 'https://tiles.openfreemap.org/styles/positron',
  dark:     'https://tiles.openfreemap.org/styles/dark',
}

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
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLES[variant],
      center: [center.lng, center.lat],
      zoom,
      pitch,
      attributionControl: false,
      interactive,
      // Cap at 2x — high-DPR Androids (3x+) would otherwise burn battery
      // rendering at native resolution. 2x is the sharpness sweet spot.
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    })
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
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize()
      fitRouteRef.current?.()
    })
    ro.observe(containerRef.current)

    return () => { ro.disconnect(); map.remove(); mapRef.current = null }
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
  // the caller changes padding (e.g. sheet expand/collapse).
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setPadding(padding)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padding.top, padding.bottom, padding.left, padding.right])

  // React to pitch changes after init — caller can flatten the camera
  // (e.g. to 0 when a route is drawn so fitBounds is exact, no 3D skew).
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.easeTo({ pitch, duration: 500 })
  }, [pitch])

  // Render rider markers
  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
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

  // Render pickup marker
  useEffect(() => {
    if (!mapRef.current) return
    if (pickupMarkerRef.current) { pickupMarkerRef.current.remove(); pickupMarkerRef.current = null }
    if (!pickup) return
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="
        width: 18px; height: 18px; border-radius: 50%;
        background: #FACC15; border: 3px solid #0A0A0A;
        box-shadow: 0 0 14px rgba(250,204,21,0.85);
      "></div>
    `
    pickupMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([pickup.lng, pickup.lat])
      .addTo(mapRef.current)
  }, [pickup])

  // Render dropoff marker
  useEffect(() => {
    if (!mapRef.current) return
    if (dropoffMarkerRef.current) { dropoffMarkerRef.current.remove(); dropoffMarkerRef.current = null }
    if (!dropoff) return
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="
        width: 18px; height: 18px; border-radius: 4px;
        background: #22C55E; border: 3px solid #0A0A0A;
        box-shadow: 0 0 14px rgba(34,197,94,0.85);
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
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative' }}
      className="border border-line"
    />
  )
}
