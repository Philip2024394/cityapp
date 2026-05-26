'use client'
import { MapPin, ExternalLink } from 'lucide-react'

// Visit Us map preview — stylised "approximate area" visual that
// always renders without a tile pipeline. We draw a synthetic
// neighbourhood (roads + blocks + a winding main road + a park
// patch) in the beautician's theme color via SVG so the surface
// actually reads as a map rather than a blank grid. The exact
// position is conveyed only by the centered pulse, so we never
// reveal a precise address.

export default function VisitUsMap({
  lat, lng, theme, height = 200,
}: {
  lat: number
  lng: number
  /** Accent hex driving the gradient, roads, pin + pulse. */
  theme: string
  height?: number
}) {
  // Google Maps directions URL — same target as the panel's main CTA.
  const mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-gray-200"
      style={{ height, background: `${theme}10` }}
    >
      {/* Stylised neighbourhood SVG — never represents the actual map,
          just gives the surface believable "roads + blocks + park"
          texture in the theme colour. preserveAspectRatio:none lets it
          stretch to whatever container height we get. */}
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden
      >
        {/* Soft land background — slightly warmer than the page bg. */}
        <rect x="0" y="0" width="400" height="200" fill={`${theme}10`} />

        {/* Park patch — irregular blob, light green at low opacity so
            it reads as foliage on any theme color. */}
        <path
          d="M 245 35 Q 280 22 310 38 Q 335 60 320 90 Q 295 105 265 92 Q 240 75 245 35 Z"
          fill="#22C55E"
          opacity="0.18"
        />

        {/* Water sliver — bottom-left corner. Slight blue under the
            theme so it stays as a water cue. */}
        <path
          d="M -10 170 Q 30 158 70 165 Q 110 172 150 168 L 150 210 L -10 210 Z"
          fill="#60A5FA"
          opacity="0.22"
        />

        {/* Block rectangles (buildings clusters). Tile the surface
            without hiding the center where the pin sits. */}
        {[
          { x: 30,  y: 25,  w: 50, h: 32 },
          { x: 92,  y: 25,  w: 60, h: 32 },
          { x: 30,  y: 70,  w: 50, h: 38 },
          { x: 92,  y: 70,  w: 60, h: 38 },
          { x: 30,  y: 120, w: 50, h: 28 },
          { x: 92,  y: 120, w: 60, h: 28 },
          { x: 260, y: 120, w: 55, h: 30 },
          { x: 325, y: 120, w: 55, h: 30 },
          { x: 260, y: 158, w: 55, h: 30 },
          { x: 325, y: 158, w: 55, h: 30 },
        ].map((b) => (
          <rect
            key={`${b.x}-${b.y}`}
            x={b.x} y={b.y} width={b.w} height={b.h}
            rx="2"
            fill={theme}
            opacity="0.18"
          />
        ))}

        {/* Road network — semi-opaque white so it reads against any
            theme. Vertical + horizontal grid + a diagonal main road. */}
        <g stroke="#FFFFFF" strokeOpacity="0.85" strokeLinecap="round">
          {/* Horizontals */}
          <line x1="0" y1="62"  x2="400" y2="62"  strokeWidth="6" />
          <line x1="0" y1="114" x2="400" y2="114" strokeWidth="6" />
          <line x1="0" y1="155" x2="400" y2="155" strokeWidth="5" />
          {/* Verticals */}
          <line x1="85"  y1="0" x2="85"  y2="200" strokeWidth="6" />
          <line x1="160" y1="0" x2="160" y2="200" strokeWidth="6" />
          <line x1="240" y1="0" x2="240" y2="200" strokeWidth="6" />
          <line x1="320" y1="0" x2="320" y2="200" strokeWidth="5" />
          {/* Diagonal main road — gives the layout some life. */}
          <line x1="-20" y1="200" x2="430" y2="-20" strokeWidth="9" />
        </g>

        {/* Road centerline dashes on the diagonal — adds the "road"
            cue without overdoing it. */}
        <line
          x1="-20" y1="200" x2="430" y2="-20"
          stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.9"
        />
      </svg>

      {/* Keyframes for the area pulse — three rings of expanding
          opacity-fade so the eye reads it as a soft "you are here"
          beacon rather than a sharp marker. */}
      <style>{`
        @keyframes cr-area-ping{0%{transform:scale(0.6);opacity:0.55}80%,100%{transform:scale(2.6);opacity:0}}
        @keyframes cr-area-bob{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,calc(-50% - 4px))}}
      `}</style>

      {/* Center pulse stack — sits on top of the synthetic map. */}
      <div
        className="absolute left-1/2 top-1/2 pointer-events-none"
        style={{
          width: 64, height: 64,
          transform: 'translate(-50%, -50%)',
          animation: 'cr-area-bob 3s ease-in-out infinite',
        }}
        aria-hidden
      >
        {[0, 600, 1200].map((delay) => (
          <span
            key={delay}
            className="absolute inset-0 rounded-full"
            style={{
              background: theme,
              opacity: 0.45,
              animation: 'cr-area-ping 2.4s cubic-bezier(0,0,0.2,1) infinite',
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className="rounded-full flex items-center justify-center text-white shadow-lg"
            style={{
              width: 36, height: 36,
              background: theme,
              boxShadow: `0 4px 12px ${theme}55, 0 0 0 4px rgba(255,255,255,0.9)`,
            }}
          >
            <MapPin className="w-4 h-4" strokeWidth={2.5} />
          </span>
        </span>
      </div>

      {/* Approximate-area caption — small white pill, top-left. */}
      <div
        className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
        style={{ color: theme }}
      >
        Approx. area
      </div>

      {/* Open in Maps pill — top-right corner, escape to Google Maps. */}
      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-white text-[11px] font-extrabold shadow-md active:scale-[0.97]"
        style={{ background: theme }}
      >
        <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
        Open in Maps
      </a>
    </div>
  )
}
