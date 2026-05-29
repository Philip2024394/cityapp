'use client'
import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'

// =============================================================================
// VendorCartButton — vendor-agnostic floating cart icon.
//
// Lifted from PlaceProfileShell's top-right cart pill so beautician,
// handyman, laundry, massage, home-clean and tour-guide can drop in the
// same control. White-glass background, themeColor-tinted badge, scale-
// on-press, smooth fade-in when the cart fills.
//
// Positioning is the caller's responsibility (`position: fixed` with the
// right offset) — verticals already manage their own hero chrome layout,
// so wrapping this in a positioned container at the call site keeps the
// component reusable across pages that don't share PlaceProfileShell's
// "top-3 right-3" stack.
// =============================================================================

const BRAND_NAVY = '#0F172A'

export type VendorCartButtonProps = {
  totalQty:   number
  themeColor: string
  onClick:    () => void
  /**
   * Optional aria-label override. Defaults to a sensible "Open cart …"
   * string that includes the current item count.
   */
  ariaLabel?: string
}

export default function VendorCartButton({
  totalQty, themeColor, onClick, ariaLabel,
}: VendorCartButtonProps) {
  // Smooth fade-in — when totalQty crosses from 0 to >0 we want the pill
  // to ease in rather than pop. We delay un-mount via a state flag so the
  // exit transition can play out before the DOM node is gone.
  const [visible, setVisible] = useState(totalQty > 0)
  useEffect(() => {
    if (totalQty > 0) {
      setVisible(true)
      return
    }
    // Fade out, then unmount after the transition window so the empty
    // state truly hides the chip (matches the food UX — no ghost pill).
    const t = setTimeout(() => setVisible(false), 220)
    return () => clearTimeout(t)
  }, [totalQty])

  if (totalQty <= 0 && !visible) return null

  const label = ariaLabel ?? (totalQty > 0
    ? `Open cart (${totalQty} item${totalQty === 1 ? '' : 's'})`
    : 'Open cart')

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative w-10 h-10 rounded-full flex items-center justify-center text-black shadow-md active:scale-[0.96] transition"
      style={{
        background:           'rgba(255,255,255,0.92)',
        backdropFilter:       'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        minWidth:             44,
        minHeight:            44,
        opacity:              totalQty > 0 ? 1 : 0,
        transform:            totalQty > 0 ? 'scale(1)' : 'scale(0.85)',
        transition:           'opacity 200ms ease, transform 200ms ease',
        pointerEvents:        totalQty > 0 ? 'auto' : 'none',
      }}
    >
      <ShoppingBag className="w-4 h-4" strokeWidth={2.5} />
      {totalQty > 0 && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black leading-none shadow"
          style={{ background: themeColor, color: BRAND_NAVY, border: '1.5px solid #FFFFFF' }}
        >
          {totalQty > 99 ? '99+' : totalQty}
        </span>
      )}
    </button>
  )
}
