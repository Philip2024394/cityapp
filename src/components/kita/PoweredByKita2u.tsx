'use client'
import { useState } from 'react'
import KitaSignupPopup from './KitaSignupPopup'

// =============================================================================
// PoweredByKita2u — tiny "Powered by Kita2u.com" link rendered at the bottom
// of every profile page. Opens the claim-your-handle popup instead of
// navigating, so creators can pick their handle without leaving the page.
// =============================================================================

export default function PoweredByKita2u({
  defaultVertical,
}: {
  /** Forwarded to the popup so the matching macro + specialty are
   *  pre-selected when the user opens it from a vertical-specific
   *  profile (e.g. beautician → Beauty & Wellness > Beautician). */
  defaultVertical?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="w-full flex justify-center py-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] font-bold text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
          aria-label="Claim your Kita2u.com link"
        >
          <span>Powered by</span>
          <span style={{ color: '#FACC15' }}>Kita2u.com</span>
        </button>
      </div>
      {open && (
        <KitaSignupPopup
          onClose={() => setOpen(false)}
          defaultVertical={defaultVertical}
        />
      )}
    </>
  )
}
