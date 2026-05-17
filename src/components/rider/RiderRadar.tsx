'use client'
import { useEffect, useState } from 'react'
import { MapPin, Navigation2, Clock } from 'lucide-react'
import { haversineKm } from '@/lib/geo/haversine'
import { bearingDeg, bearingToSvgOffset, estimateEtaMin, cardinalLabel } from '@/lib/geo/bearing'

type Props = {
  customer: { lat: number; lng: number } | null
  rider:    { lat: number; lng: number; name: string }
}

// SVG canvas dimensions. 280x280 fits nicely in our max-w-2xl content column.
const SIZE = 280
const C = SIZE / 2                  // center coord
const RINGS = [0.30, 0.50, 0.72, 0.92]  // ring radii as % of canvas
const MAX_R = C * 0.92              // outermost ring radius in px

// Rider radar — replaces the static map on the rider profile.
// Shows the customer at center with breathing radar rings, the rider as
// a yellow dot at the correct compass bearing + distance-proportional
// position, plus a dashed link line and a live ETA / distance card.
//
// Pure SVG, no map tiles. Loads instantly, looks crisp on any DPR.
export default function RiderRadar({ customer, rider }: Props) {
  const [now, setNow] = useState(Date.now())

  // Rotating sweep — re-renders every 60ms for smooth radar-needle motion.
  useEffect(() => {
    let raf = 0
    const tick = () => { setNow(Date.now()); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Without customer GPS we can't compute bearing/distance — show CTA.
  if (!customer) {
    return (
      <div className="card p-6 grid place-items-center text-center min-h-[200px]">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/25 mx-auto flex items-center justify-center mb-3">
            <Navigation2 className="w-5 h-5 text-brand" />
          </div>
          <div className="font-extrabold text-[15px]">
            Allow GPS location
          </div>
          <div className="text-[13px] text-muted mt-1.5 max-w-[260px]">
            To see how close <strong className="text-ink">{rider.name}</strong> is to you + the ETA estimate, allow location access.
          </div>
        </div>
      </div>
    )
  }

  const distanceKm = haversineKm(customer, rider)
  const bearing = bearingDeg(customer, rider)
  const etaMin = estimateEtaMin(distanceKm)
  const direction = cardinalLabel(bearing)

  // Scale the rider's radar position so they sit ~75% of the way to the
  // outer ring regardless of actual distance (radar adapts to the trip).
  const riderRadius = MAX_R * 0.75
  const { dx, dy } = bearingToSvgOffset(bearing, riderRadius)
  const riderX = C + dx
  const riderY = C + dy

  // Sweep needle — rotates clockwise, 360° every 4 seconds.
  const sweepDeg = (now / 11) % 360

  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(250,204,21,0.06), transparent 60%)' }}
      />

      <div className="relative grid gap-5 items-center" style={{ gridTemplateColumns: `${SIZE}px 1fr` }}>
        {/* ── RADAR SVG ── */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ display: 'block', filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.4))' }}
        >
          {/* Cardinal labels */}
          {(['N', 'E', 'S', 'W'] as const).map((d) => {
            const angle = { N: 0, E: 90, S: 180, W: 270 }[d]
            const { dx, dy } = bearingToSvgOffset(angle, C - 6)
            return (
              <text
                key={d}
                x={C + dx}
                y={C + dy}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.32)"
                fontSize="11"
                fontWeight="800"
                style={{ letterSpacing: '0.05em' }}
              >
                {d}
              </text>
            )
          })}

          {/* Concentric breathing rings */}
          {RINGS.map((r, i) => (
            <circle
              key={i}
              cx={C} cy={C} r={C * r}
              fill="none"
              stroke={`rgba(250,204,21,${0.06 + i * 0.04})`}
              strokeWidth={i === RINGS.length - 1 ? 1.5 : 1}
            />
          ))}

          {/* Cross hairs */}
          <line x1={C} y1={C - MAX_R - 4} x2={C} y2={C + MAX_R + 4} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1={C - MAX_R - 4} y1={C} x2={C + MAX_R + 4} y2={C} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

          {/* Rotating radar sweep */}
          <g transform={`rotate(${sweepDeg} ${C} ${C})`}>
            <defs>
              <linearGradient id="rrSweep" x1="0" y1="0" x2="0" y2="-1">
                <stop offset="0%"  stopColor="rgba(250,204,21,0)" />
                <stop offset="60%" stopColor="rgba(250,204,21,0.05)" />
                <stop offset="100%" stopColor="rgba(250,204,21,0.35)" />
              </linearGradient>
            </defs>
            <path
              d={`M ${C} ${C} L ${C} ${C - MAX_R} A ${MAX_R} ${MAX_R} 0 0 1 ${C + Math.sin(Math.PI / 6) * MAX_R} ${C - Math.cos(Math.PI / 6) * MAX_R} Z`}
              fill="url(#rrSweep)"
            />
          </g>

          {/* Bearing line — center → rider */}
          <line
            x1={C} y1={C} x2={riderX} y2={riderY}
            stroke="rgba(250,204,21,0.6)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Distance label on the line, halfway along */}
          <g transform={`translate(${(C + riderX) / 2}, ${(C + riderY) / 2})`}>
            <rect
              x="-32" y="-11" width="64" height="22" rx="11"
              fill="#0A0A0A"
              stroke="rgba(250,204,21,0.35)"
              strokeWidth="1"
            />
            <text
              x="0" y="0" textAnchor="middle" dominantBaseline="middle"
              fill="#FACC15" fontSize="12" fontWeight="900"
            >
              {distanceKm.toFixed(1)} km
            </text>
          </g>

          {/* Rider dot — pulsing yellow with glow */}
          <circle cx={riderX} cy={riderY} r="14" fill="rgba(250,204,21,0.20)">
            <animate attributeName="r" values="14;22;14" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.55;0;0.55" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={riderX} cy={riderY} r="6.5" fill="#FACC15" stroke="#0A0A0A" strokeWidth="2" />

          {/* Center — customer dot */}
          <circle cx={C} cy={C} r="18" fill="rgba(34,197,94,0.18)">
            <animate attributeName="r" values="18;28;18" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx={C} cy={C} r="7.5" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
          <circle cx={C} cy={C} r="3"   fill="#22C55E" />
        </svg>

        {/* ── INFO CARD ── */}
        <div className="space-y-4">
          <div>
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim leading-none">Rider</div>
            <div className="font-extrabold text-[16px] mt-1">{rider.name}</div>
          </div>

          <div>
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim leading-none">Distance</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[28px] font-extrabold gradient-text leading-none">{distanceKm.toFixed(1)}</span>
              <span className="text-[14px] font-bold text-muted">km</span>
            </div>
          </div>

          <div>
            <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim leading-none flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Pickup ETA
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[24px] font-extrabold text-online leading-none">{etaMin}</span>
              <span className="text-[14px] font-bold text-muted">min</span>
            </div>
          </div>

          <div className="pt-3 border-t border-line text-[13px] text-muted flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-brand shrink-0" />
            Direction <span className="text-ink font-bold">{direction}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
