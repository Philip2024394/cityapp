'use client'

// ============================================================================
// TripPriceBanner
// ----------------------------------------------------------------------------
// Sits above the pickup tile on /cari once a drop-off is set. Shape:
// black container with a 45° angled cut on the right edge (ribbon/tag
// look) so it visually points toward the trip flow below.
//
// Copy is compliance-checked: we only ever surface a driver's OWN
// published `price_min`, never a number we calculated. Label is
// "Starting from Rp X" + "Estimate · agreed with driver", which keeps
// us inside PM 12/2019 directory safe-harbour. We do NOT display
// "Trip Price" or "Total fare" — those phrasings would imply we set
// the price and push us into APJT operator territory.
//
// Fare lookup happens UP-tree on /cari now (single shared fetch keyed on
// pickup coords). The banner is pure presentation — pass the resolved
// lowest fare in. Null means "no driver published a price yet" → price
// line hidden, distance + estimate caption still render.
// ============================================================================

type Props = {
  /** Trip distance in km — set once both pickup + dropoff are picked.
   *  null = no drop-off yet → banner does not render. */
  distanceKm: number | null
  /** Lowest published fare from drivers near the pickup, in IDR.
   *  null = no data yet or no drivers in the area. */
  lowestFareIdr: number | null
}

function formatRupiah(n: number): string {
  // Indonesian thousands separator is "." — but for the customer-facing
  // banner we use comma for international legibility, matching the rest
  // of the booking UI.
  return n.toLocaleString('en-US')
}

export default function TripPriceBanner({ distanceKm, lowestFareIdr }: Props) {
  if (distanceKm == null) return null
  const lowest = lowestFareIdr

  return (
    <div
      // Black tag shape. The right edge is sliced at 45° via clip-path
      // so the container reads as a ribbon pointing toward the pickup
      // tile below. 28px is the size of the angled cut — tweak together
      // with `pr-10` if you change the depth.
      className="text-white"
      style={{
        background: '#0A0A0A',
        clipPath: 'polygon(0 0, calc(100% - 28px) 0, 100% 50%, calc(100% - 28px) 100%, 0 100%)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
      }}
    >
      <div className="pl-3 pr-10 py-1.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          {lowest != null && (
            <span className="text-[13px] font-extrabold tracking-tight">
              Starting from Rp {formatRupiah(lowest)}
            </span>
          )}
          {lowest != null && (
            <span className="text-[10px] text-white/40 leading-none">·</span>
          )}
          <span className="text-[11px] font-bold text-white/75 tracking-tight">
            {distanceKm.toFixed(1)} km
          </span>
        </div>
        <div className="text-[9px] uppercase tracking-wider text-white/45 mt-0.5">
          Estimate · agreed with driver
        </div>
      </div>
    </div>
  )
}
