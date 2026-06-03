// ============================================================================
// PriceTile — canonical IDR amount + auto-localized FX equivalent
// ----------------------------------------------------------------------------
// Server component used on the /pricing page (and anywhere we display a
// platform price to a global audience). Renders:
//
//   Rp 38.000
//   ≈ US$2.40              ← only when the viewer's currency isn't IDR
//   per month              ← caller-supplied unit label
//
// IDR is always the canonical price; the foreign-currency line is a
// DISPLAY-ONLY estimate sourced from a free public FX endpoint cached
// for 24h. We don't bill in foreign currency yet — that lands in Phase 2
// alongside Stripe Checkout for non-QRIS countries.
// ============================================================================

import { headers } from 'next/headers'
import { fetchFxRates } from '@/lib/fx/rates'
import { formatLocalEquivalent } from '@/lib/fx/format'
import { detectCurrencyFromHeaders } from '@/lib/fx/geo'

export default async function PriceTile({
  idrAmount,
  unitLabel,
  highlight,
}: {
  idrAmount: number
  /** Sub-line under the price, e.g. "per month", "per year", "one-time". */
  unitLabel?: string
  /** Renders the tile with the brand-yellow accent — used to mark the
   *  recommended tier on the comparison table. */
  highlight?: boolean
}) {
  const h        = await headers()
  const currency = detectCurrencyFromHeaders(h)
  const rates    = await fetchFxRates()
  const idrLabel = `Rp ${idrAmount.toLocaleString('id-ID')}`
  const fxLabel  = formatLocalEquivalent(idrAmount, currency, rates)

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{
        background:   highlight ? 'linear-gradient(135deg, #FEF9C3 0%, #FFFFFF 100%)' : '#FFFFFF',
        borderColor:  highlight ? '#FACC15' : '#E4E4E7',
        boxShadow:    '0 2px 14px rgba(0,0,0,0.05)',
      }}
    >
      <div
        className="text-[34px] sm:text-[40px] font-black leading-none tracking-tight"
        style={{ color: '#0A0A0A' }}
      >
        {idrLabel}
      </div>
      {fxLabel && (
        <div className="text-[13px] font-bold mt-1.5" style={{ color: '#854D0E' }}>
          {fxLabel}
        </div>
      )}
      {unitLabel && (
        <div className="text-[13px] mt-2" style={{ color: '#52525B' }}>
          {unitLabel}
        </div>
      )}
    </div>
  )
}
