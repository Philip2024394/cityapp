'use client'
import { useEffect, useRef } from 'react'
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl'
import { Protocol as PMTilesProtocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getResilientStyle } from '@/lib/map/resilientStyle'

// Minimal map for the Visit Us panel — single themed marker with a
// glowing/pinging pulse around it. Static (no interactivity, no
// dragging) so it reads as a "preview" rather than a tool. Tap to open
// in Google Maps for navigation.
//
// Reuses the PMTiles protocol already registered by the rider map.

if (typeof window !== 'undefined' && !(window as unknown as { __cr_pmtiles?: boolean }).__cr_pmtiles) {
  const protocol = new PMTilesProtocol()
  maplibregl.addProtocol('pmtiles', protocol.tile)
  ;(window as unknown as { __cr_pmtiles?: boolean }).__cr_pmtiles = true
}

export default function VisitUsMap({
  lat, lng, theme, height = 180,
}: {
  lat: number
  lng: number
  /** Accent hex driving the marker color + pulse. */
  theme: string
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef       = useRef<MLMap | null>(null)
  const markerRef    = useRef<Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false
    const container = containerRef.current
    void getResilientStyle('positron').then((style) => {
      if (cancelled || !container) return
      const map = new maplibregl.Map({
        container,
        style: style as unknown as maplibregl.StyleSpecification,
        center: [lng, lat],
        zoom: 16,
        interactive: false,
        attributionControl: false,
      })
      mapRef.current = map

      // Custom HTML marker — dot + two animated pulses (themed).
      const el = document.createElement('div')
      el.style.position = 'relative'
      el.style.width = '20px'
      el.style.height = '20px'
      el.innerHTML = `
        <span style="position:absolute;inset:0;border-radius:9999px;background:${theme};opacity:0.45;animation:cr-visit-ping 1.6s cubic-bezier(0,0,0.2,1) infinite"></span>
        <span style="position:absolute;inset:0;border-radius:9999px;background:${theme};opacity:0.65;animation:cr-visit-ping 1s cubic-bezier(0,0,0.2,1) infinite"></span>
        <span style="position:absolute;inset:3px;border-radius:9999px;background:${theme};border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></span>
      `
      markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map)
    })

    return () => {
      cancelled = true
      markerRef.current?.remove()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [lat, lng, theme])

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height }}>
      {/* Keyframes for the marker pulses (scoped via name). */}
      <style>{`@keyframes cr-visit-ping{75%,100%{transform:scale(2.4);opacity:0}}`}</style>
      <div ref={containerRef} className="absolute inset-0" />
      {/* Tap overlay routes to Google Maps directions. */}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[11px] font-extrabold shadow-md active:scale-[0.97]"
        style={{ background: theme }}
      >
        Open in Maps →
      </a>
    </div>
  )
}
