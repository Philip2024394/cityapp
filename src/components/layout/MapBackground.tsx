'use client'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
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
// Two layers below the readability overlay:
//   1. StaticFallback — pure CSS+inline-SVG, ALWAYS renders, zero network.
//      Identical visual identity (dark base + pulsing pings) so the page
//      looks the same when the device is offline.
//   2. Maplibre live map — paints OVER the fallback when tiles load.
//      The canvas is transparent until Maplibre processes the style, so
//      the fallback shows through during load and stays visible if the
//      network never delivers the style/tiles.
//
// Overlay gradient on top keeps content readable on every page (forms,
// dashboards, lists). Heavier dim than the original landing-only overlay.
export default function MapBackground() {
  const heroRiders = useMemo(() => buildHeroRiders(42), [])
  return (
    <>
      {/* Layer 1 — offline-safe CSS+SVG fallback. Always renders. */}
      <StaticFallback />

      {/* Layer 2 — Maplibre live map. Paints over the fallback when
          tiles arrive. If the network never delivers, the canvas
          stays transparent and the fallback below stays visible. */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
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

      {/* Layer 3 — readability overlay. Global, tuned heavier than
          landing-only so form pages + dashboards stay legible. */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        aria-hidden
        style={{
          background: [
            'radial-gradient(ellipse 80% 50% at 50% 35%, rgba(250,204,21,0.08) 0%, transparent 60%)',
            'linear-gradient(to bottom, rgba(10,10,10,0.65) 0%, rgba(10,10,10,0.78) 50%, rgba(10,10,10,0.92) 100%)',
          ].join(', '),
        }}
      />
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
function StaticFallback() {
  // 42 pings in the same golden-angle scatter as the Maplibre riders,
  // but positioned in viewport percentages (no map projection needed).
  const pings = Array.from({ length: 42 }, (_, i) => {
    const angle = i * 2.39996323
    const radiusPct = 6 + (i / 42) * 36
    return {
      i,
      x: 50 + Math.cos(angle) * radiusPct,
      y: 50 + Math.sin(angle) * radiusPct,
      delay: (i * 0.06) % 2.6,
    }
  })

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
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
          Maplibre markers, positioned in % so they fill the viewport. */}
      {pings.map((p) => (
        <div
          key={p.i}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 12,
            height: 12,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'rgba(250,204,21,0.55)',
              animation: `ridePing 2.6s ease-out ${p.delay}s infinite`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 8,
              height: 8,
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
