'use client'
import { useEffect, useRef } from 'react'
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { type DemandZone, categoryFor, COLOR_FOR_CATEGORY } from '@/data/mockHotspots'

type Props = {
  zones: DemandZone[]
  highlightZoneId?: string
  height?: string
  center?: { lat: number; lng: number }
  zoom?: number
}

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

// Heatmap-style overlay on a dark OSM base. Each demand zone renders
// as a translucent coloured circle scaled by intensity. The colour
// signals the rider's action:
//   🟢 green  → high demand, low supply (go here)
//   🟡 yellow → balanced
//   🔴 red    → oversupplied (avoid)
//
// Pure HTML markers (not Maplibre paint layers) — easier to animate
// with CSS keyframes and works fine for ~20 zones. Switch to a
// proper paint-layer GeoJSON source if zone count grows past ~100.
export default function HotspotMap({
  zones, highlightZoneId, height = '320px',
  center = { lat: -7.7928, lng: 110.3657 }, zoom = 11.4,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const markersRef = useRef<Marker[]>([])

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [center.lng, center.lat],
      zoom,
      // OpenFreeMap / OSM attribution — compact "i" pill, see RiderMap.
      attributionControl: { compact: true },
      interactive: true,
      // Constrain pan to Indonesia — keeps the hotspot heatmap in
      // the country's reachable area instead of the open Pacific.
      maxBounds: [[94.0, -12.0], [142.0, 7.0]],
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    })
    mapRef.current = map

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
          if (layer.type === 'background') {
            map.setPaintProperty(layer.id, 'background-color', '#0A0A0A')
          }
          if (layer.type === 'symbol') {
            map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        }
      } catch { /* style still loading */ }

      map.resize()
      requestAnimationFrame(() => map.resize())
      setTimeout(() => map.resize(), 300)
    })

    const ro = new ResizeObserver(() => { mapRef.current?.resize() })
    ro.observe(containerRef.current)

    return () => { ro.disconnect(); map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render zone markers — coloured translucent circles with names
  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    zones.forEach(z => {
      const cat = categoryFor(z)
      const color = COLOR_FOR_CATEGORY[cat]
      const isHighlight = z.id === highlightZoneId

      const el = document.createElement('div')
      el.innerHTML = `
        <div style="
          position: relative;
          width: ${z.sizePx}px;
          height: ${z.sizePx}px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        ">
          <div style="
            position: absolute; inset: 0;
            border-radius: 50%;
            background: ${color};
            opacity: 0.22;
            animation: hotPulse 3.2s ease-in-out infinite;
            ${isHighlight ? `border: 2px solid ${color}; opacity: 0.45;` : ''}
          "></div>
          <div style="
            position: absolute; inset: 25%;
            border-radius: 50%;
            background: ${color};
            opacity: 0.45;
          "></div>
          <div style="
            position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
            color: #0A0A0A; background: ${color};
            font-size: 11px; font-weight: 900; letter-spacing: 0.02em;
            padding: 4px 9px; border-radius: 9999px;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          ">${z.name} · ${z.demand}</div>
        </div>
      `
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([z.lng, z.lat])
        .addTo(mapRef.current!)
      markersRef.current.push(m)
    })
  }, [zones, highlightZoneId])

  return (
    <>
      <div
        ref={containerRef}
        style={{ height, width: '100%', borderRadius: 20, overflow: 'hidden' }}
        className="border border-line"
      />
      <style>{`
        @keyframes hotPulse {
          0%, 100% { transform: scale(1);    opacity: 0.22; }
          50%      { transform: scale(1.10); opacity: 0.32; }
        }
      `}</style>
    </>
  )
}
