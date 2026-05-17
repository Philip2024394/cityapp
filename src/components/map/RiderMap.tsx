'use client'
import { useEffect, useRef } from 'react'
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Rider } from '@/types/rider'

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
}

// OpenFreeMap — community-run vector tiles, OSM data, no API key required.
const OPENFREEMAP_STYLES = {
  positron: 'https://tiles.openfreemap.org/styles/positron',
  dark:     'https://tiles.openfreemap.org/styles/dark',
}

export default function RiderMap({
  center, zoom = 13, riders = [], pickup, dropoff, onDropoffSet,
  showRoute = false, height = '320px', interactive = true,
  variant = 'positron', hideLabels = false, autoPan = false,
  markerStyle = 'scooter', roadsOnly = false,
}: Props) {
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
      attributionControl: false,
      interactive,
    })
    mapRef.current = map

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

    // Observe container size changes — mobile URL bar toggle, parent layout
    // changes, image-loaded shifts. Each change triggers map.resize() so tiles
    // re-render at the correct dimensions.
    const ro = new ResizeObserver(() => { mapRef.current?.resize() })
    ro.observe(containerRef.current)

    return () => { ro.disconnect(); map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update center when prop changes
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.flyTo({ center: [center.lng, center.lat], zoom, duration: 600 })
  }, [center.lat, center.lng, zoom])

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

  // Route line between pickup and dropoff
  useEffect(() => {
    const map = mapRef.current
    if (!map || !showRoute) return
    const drawRoute = () => {
      if (!pickup || !dropoff) {
        if (map.getLayer('route-line')) map.removeLayer('route-line')
        if (map.getSource('route')) map.removeSource('route')
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
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#FACC15',
            'line-width': 3,
            'line-dasharray': [2, 1.5],
            'line-opacity': 0.8,
          },
        })
      }
      // Auto-fit bounds
      const bounds = new maplibregl.LngLatBounds()
      bounds.extend([pickup.lng, pickup.lat])
      bounds.extend([dropoff.lng, dropoff.lat])
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 700 })
    }
    if (map.isStyleLoaded()) drawRoute()
    else map.once('load', drawRoute)
  }, [pickup, dropoff, showRoute])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative' }}
      className="border border-line"
    />
  )
}
