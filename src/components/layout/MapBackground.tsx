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
// Overlay gradient on top is tuned to keep content readable on every
// page (forms, dashboards, lists). Heavier dim than the original
// landing-only overlay because deep pages have more text on them.
export default function MapBackground() {
  const heroRiders = useMemo(() => buildHeroRiders(42), [])
  return (
    <>
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

      {/* Readability overlay — global. Tuned heavier than landing-only
          so form pages + dashboards stay legible. */}
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
