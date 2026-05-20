'use client'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import type { Rider } from '@/types/rider'

// Maplibre is lazy-loaded — the ~85KB chunk only enters the bundle
// when the first page that mounts this background renders. Cached
// after first navigation; subsequent route changes feel instant.
const LandingMap = dynamic(() => import('@/components/map/RiderMapDynamic'), { ssr: false })

const YOGYA_CENTER = { lat: -7.7928, lng: 110.3657 }

// 42 demo rider pings sprinkled across a Yogyakarta bounding box.
// Deterministic golden-angle scatter so SSR + client hydration agree.
function buildHeroRiders(count: number): Rider[] {
  const out: Rider[] = []
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996323
    const radius = 0.005 + (i / count) * 0.045
    out.push({
      id: `hero-${i}`,
      slug: `hero-${i}`,
      name: '',
      photoUrl: '',
      whatsappE164: '',
      bio: '',
      area: '',
      city: 'Yogyakarta',
      services: [],
      bike: { make: '', model: '', year: 0, color: '', type: 'matic', hasBox: false },
      pricePerKm: 0, minFee: 0,
      isOnline: true,
      lastSeenAt: '',
      lat: YOGYA_CENTER.lat + Math.sin(angle) * radius,
      lng: YOGYA_CENTER.lng + Math.cos(angle) * radius,
      subscriptionStatus: 'active',
    })
  }
  return out
}

// Global app background — dark Yogyakarta map, roads-only, label-free,
// 42 pulsing yellow rider pings, slow auto-pan. Mounted once at the
// root layout, fixed to the viewport, so it underlays every page
// without re-initialising on navigation.
//
// Two stacked layers, no global dim overlay (content uses per-element
// glass for legibility, so the map shows through fully):
//   1. StaticFallback — pure CSS+inline-SVG, ALWAYS renders, zero network.
//      Identical visual identity (dark base + pulsing pings) so the page
//      looks the same when the device is offline.
//   2. Maplibre live map — paints OVER the fallback when tiles load.
//      The canvas is transparent until Maplibre processes the style, so
//      the fallback shows through during load and stays visible if the
//      network never delivers the style/tiles.
export default function MapBackground() {
  const heroRiders = useMemo(() => buildHeroRiders(42), [])

  // Pause the live map layer while the tab is hidden. MapBackground
  // mounts at the root layout and never unmounts during SPA navigation,
  // so on a 2GB Android the MapLibre canvas + 42 markers + tile cache
  // sit in memory indefinitely (audit 2026-05 — low-memory tab discard
  // risk). Hidden → unmount the map; visible → remount. The CSS+SVG
  // fallback continues to render so the background never goes blank.
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return (
    <>
      {/* Layer 1 — offline-safe CSS+SVG fallback. Always renders. */}
      <StaticFallback />

      {/* Layer 2 — Maplibre live map. Paints over the fallback when
          tiles arrive. If the network never delivers, the canvas
          stays transparent and the fallback below stays visible.
          Unmounts when tab hidden to release GPU/tile cache memory. */}
      {visible && (
        <div
          className="fixed inset-0 -z-10 pointer-events-none"
          aria-hidden
        >
          <LandingMap
            center={YOGYA_CENTER}
            zoom={13}
            height="100dvh"
            interactive={false}
            variant="dark"
            hideLabels
            roadsOnly
            autoPan
            riders={heroRiders}
            markerStyle="ping"
          />
        </div>
      )}

      {/* No global readability overlay — the background map shows through
          fully on every page. Per-element glass (.glass-strong on AppNav,
          .card on content blocks, the frosted /cari containers) handles
          text legibility on a per-component basis. */}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Offline-safe static fallback. Pure CSS + inline SVG — zero network.
// Renders BEHIND the Maplibre canvas at the same fixed-viewport layer.
// When Maplibre tiles load, the opaque canvas covers this. When the
// device is offline (or tiles fail to load), Maplibre's canvas stays
// transparent and this shows through, so the app always has a
// recognisable dark-map look with pulsing rider pings.
// ─────────────────────────────────────────────────────────────────────
// Pre-computed once at module load — module-level constants are evaluated
// the same way on Node SSR + the browser, eliminating any chance of float
// rounding drift between environments. All numeric values are pre-stringified
// with fixed precision so React's hydrator sees byte-identical style strings.
const STATIC_PINGS: ReadonlyArray<{
  i: number; left: string; top: string; delay: string
}> = (() => {
  const out: { i: number; left: string; top: string; delay: string }[] = []
  for (let i = 0; i < 42; i++) {
    const angle = i * 2.39996323
    const radiusPct = 6 + (i / 42) * 36
    out.push({
      i,
      left:  (50 + Math.cos(angle) * radiusPct).toFixed(3) + '%',
      top:   (50 + Math.sin(angle) * radiusPct).toFixed(3) + '%',
      delay: ((i * 0.06) % 2.6).toFixed(3) + 's',
    })
  }
  return out
})()

function StaticFallback() {
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
      aria-hidden
    >
      {/* Deep dark radial base — matches the Maplibre dark style's average tone */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, #14141a 0%, #0a0a0e 55%, #050508 100%)',
        }}
      />

      {/* Stylised "street network" — two grids of faint perpendicular lines
          plus diagonal accents. Pure CSS background-image, no SVG needed. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            // primary roads — brand-tinted, wider spacing
            'linear-gradient(0deg, transparent 49%, rgba(250,204,21,0.06) 49.6%, rgba(250,204,21,0.06) 50.4%, transparent 51%)',
            'linear-gradient(90deg, transparent 49%, rgba(250,204,21,0.06) 49.6%, rgba(250,204,21,0.06) 50.4%, transparent 51%)',
            // secondary roads — white, finer spacing
            'linear-gradient(0deg, transparent 49.4%, rgba(255,255,255,0.025) 49.7%, rgba(255,255,255,0.025) 50.3%, transparent 50.6%)',
            'linear-gradient(90deg, transparent 49.4%, rgba(255,255,255,0.025) 49.7%, rgba(255,255,255,0.025) 50.3%, transparent 50.6%)',
            // diagonal accents — feels less grid-like
            'linear-gradient(35deg, transparent 49.5%, rgba(255,255,255,0.018) 50%, transparent 50.5%)',
            'linear-gradient(-35deg, transparent 49.5%, rgba(255,255,255,0.018) 50%, transparent 50.5%)',
          ].join(', '),
          backgroundSize:
            '220px 220px, 220px 220px, 90px 90px, 90px 90px, 320px 320px, 320px 320px',
        }}
      />

      {/* 42 pulsing rider pings — same animation + delay pattern as the
          Maplibre markers, positioned in % so they fill the viewport.
          All values are pre-stringified module constants → SSR + client
          render byte-identical inline styles (no hydration mismatch). */}
      {STATIC_PINGS.map((p) => (
        <div
          key={p.i}
          className="absolute"
          style={{
            left: p.left,
            top: p.top,
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'rgba(250,204,21,0.55)',
              animation: `ridePing 2.6s ease-out ${p.delay} infinite`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '8px',
              height: '8px',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: '#FACC15',
              boxShadow:
                '0 0 8px rgba(250,204,21,0.85), 0 0 2px rgba(250,204,21,1)',
            }}
          />
        </div>
      ))}
    </div>
  )
}
