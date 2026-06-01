'use client'
// ============================================================================
// DriverDotsOverlay — animated availability dots scattered across the
// /cari hero map. Visualises live driver supply at a glance.
//
// Count is driven by the LIVE props (`onlineCount` + `busyCount`) passed
// from the /cari page — one dot per real online/busy driver in the
// filtered vehicle pool. Yellow dot = online, red dot = busy.
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

function buildDots(seed: number, onlineCount: number, busyCount: number): Dot[] {
  const rand = mulberry32(seed)
  const dots: Dot[] = []
  // Online dots first (yellow), then busy (red). Position is randomised
  // per-render but seeded so SSR/CSR agree.
  for (let i = 0; i < onlineCount; i++) {
    dots.push({
      id:        i,
      x:         4 + rand() * 92,
      y:         6 + rand() * 70,
      color:     'yellow',
      pingDur:   1.6 + rand() * 1.6,
      pingDel:   rand() * 2.5,
      wobbleId:  Math.floor(rand() * 4),
      wobbleDur: 8 + rand() * 6,
    })
  }
  for (let i = 0; i < busyCount; i++) {
    dots.push({
      id:        onlineCount + i,
      x:         4 + rand() * 92,
      y:         6 + rand() * 70,
      color:     'red',
      pingDur:   1.6 + rand() * 1.6,
      pingDel:   rand() * 2.5,
      wobbleId:  Math.floor(rand() * 4),
      wobbleDur: 8 + rand() * 6,
    })
  }
  return dots
}

export default function DriverDotsOverlay({
  onlineCount,
  busyCount,
}: {
  onlineCount: number
  busyCount:   number
}) {
  // Re-seed periodically so positions drift; visible count still tracks
  // the live props 1:1 (3 online drivers → exactly 3 yellow dots).
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const dots = useMemo(() => {
    const seed = ((onlineCount * 31 + busyCount) * 100 + tick) >>> 0
    return buildDots(seed, onlineCount, busyCount)
  }, [tick, onlineCount, busyCount])

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
