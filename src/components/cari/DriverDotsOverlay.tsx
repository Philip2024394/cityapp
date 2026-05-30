'use client'
// ============================================================================
// DriverDotsOverlay — animated availability dots scattered across the
// /cari hero map. Visualises live driver supply at a glance.
//
// Density varies by local hour (WIB, customer's clock):
//   • 00-05 (late night / dawn)  → 5-8 dots
//   • 06-09 (commute morning)    → 10-15
//   • 10-14 (midday)             → 18-25
//   • 15-19 (afternoon / evening)→ 25-35
//   • 20-23 (night)              → 18-25
//
// Colours: ~80% yellow (online), ~20% red (busy / on a trip).
// Each dot has:
//   • A solid centre with a white ring (visibility on any background)
//   • A pulsing outer ring (CSS animate-ping, varied delay)
//   • A gentle 2-axis wobble over 8-14s to feel "live"
//
// Deterministic per-hour seed so the SSR/CSR pass produces the same
// initial layout (no hydration warnings); a tick once per minute
// re-shuffles so the supply visualisation refreshes during a session.
// ============================================================================

import { useEffect, useMemo, useState } from 'react'

type Dot = {
  id:       number
  x:        number      // %
  y:        number      // %
  color:    'yellow' | 'red'
  pingDur:  number      // seconds — outer ring expansion
  pingDel:  number      // seconds — staggered start
  wobbleId: number      // 0..3, picks one of four prebuilt wobble keyframes
  wobbleDur: number     // seconds — slow drift period
}

function countForHour(hour: number, rand: () => number): number {
  if (hour >= 0 && hour <= 5)   return 5  + Math.floor(rand() * 4)   //  5-8
  if (hour >= 6 && hour <= 9)   return 10 + Math.floor(rand() * 6)   // 10-15
  if (hour >= 10 && hour <= 14) return 18 + Math.floor(rand() * 8)   // 18-25
  if (hour >= 15 && hour <= 19) return 25 + Math.floor(rand() * 11)  // 25-35
  return 18 + Math.floor(rand() * 8)                                 // 18-25
}

/** Cheap deterministic PRNG so SSR + first client render agree. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6D2B79F5) >>> 0
    let r = t
    r = Math.imul(r ^ (r >>> 15), r | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function buildDots(seed: number): Dot[] {
  const rand = mulberry32(seed)
  const hour = new Date().getHours()
  const n = countForHour(hour, rand)
  const dots: Dot[] = []
  for (let i = 0; i < n; i++) {
    dots.push({
      id:        i,
      x:         4 + rand() * 92,       // keep 4% margin off edges
      y:         6 + rand() * 70,       // top 76% of overlay (avoid bottom where the booking sheet sits)
      color:     rand() < 0.8 ? 'yellow' : 'red',
      pingDur:   1.6 + rand() * 1.6,    // 1.6–3.2s
      pingDel:   rand() * 2.5,          // 0–2.5s
      wobbleId:  Math.floor(rand() * 4),
      wobbleDur: 8 + rand() * 6,        // 8–14s
    })
  }
  return dots
}

export default function DriverDotsOverlay() {
  // Re-shuffle the dot layout every minute so the "supply" visual
  // refreshes during a long-running session. Seed by hour so it stays
  // stable within an hour (SSR + first client paint match).
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const dots = useMemo(() => {
    const hourSeed = new Date().getHours() * 100 + Math.floor(tick / 5)
    return buildDots(hourSeed)
  }, [tick])

  return (
    <div className="absolute inset-0 z-[5] pointer-events-none" aria-hidden>
      {dots.map((d) => {
        const ringColor = d.color === 'yellow' ? '#FACC15' : '#DC2626'
        const dotColor  = d.color === 'yellow' ? '#EAB308' : '#B91C1C'
        return (
          <span
            key={d.id}
            className="absolute inline-flex items-center justify-center"
            style={{
              left:           `${d.x}%`,
              top:            `${d.y}%`,
              width:          14,
              height:         14,
              transform:      'translate(-50%, -50%)',
              animation:      `cari-dot-wobble-${d.wobbleId} ${d.wobbleDur}s ease-in-out infinite`,
            }}
          >
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: ringColor,
                opacity:    0.55,
                animation:  `cari-dot-ping ${d.pingDur}s cubic-bezier(0,0,0.2,1) ${d.pingDel}s infinite`,
              }}
            />
            <span
              className="relative inline-block rounded-full"
              style={{
                width:     8,
                height:    8,
                background: dotColor,
                boxShadow: '0 0 0 1.5px #FFFFFF, 0 1px 2px rgba(0,0,0,0.35)',
              }}
            />
          </span>
        )
      })}
      <style jsx>{`
        @keyframes cari-dot-ping {
          0%   { transform: scale(0.9); opacity: 0.6; }
          75%  { transform: scale(2.2); opacity: 0;   }
          100% { transform: scale(2.2); opacity: 0;   }
        }
        @keyframes cari-dot-wobble-0 {
          0%, 100% { transform: translate(-50%, -50%); }
          50%      { transform: translate(calc(-50% + 6px), calc(-50% - 4px)); }
        }
        @keyframes cari-dot-wobble-1 {
          0%, 100% { transform: translate(-50%, -50%); }
          50%      { transform: translate(calc(-50% - 5px), calc(-50% + 5px)); }
        }
        @keyframes cari-dot-wobble-2 {
          0%, 100% { transform: translate(-50%, -50%); }
          50%      { transform: translate(calc(-50% + 4px), calc(-50% + 7px)); }
        }
        @keyframes cari-dot-wobble-3 {
          0%, 100% { transform: translate(-50%, -50%); }
          50%      { transform: translate(calc(-50% - 6px), calc(-50% - 3px)); }
        }
      `}</style>
    </div>
  )
}
