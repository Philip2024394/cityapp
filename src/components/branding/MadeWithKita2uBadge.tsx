// ============================================================================
// MadeWithKita2uBadge
// ----------------------------------------------------------------------------
// Tiny "Made with Kita2u" pill rendered at the bottom of a public profile
// page when the page owner is on the Free plan. The badge is the viral
// hook — every Free profile carries the link back to kita2u.com so
// visitors who like the look can claim their own page.
//
// Returns null when plan !== 'free' (paid tiers earn the right to
// un-brand the page). The ?ref=badge query param on the outbound link
// lets attribution track viral acquisition from Free pages.
// ============================================================================

import React from 'react'

type Plan = 'free' | 'pro' | 'studio' | null

export default function MadeWithKita2uBadge({ plan }: { plan: Plan }) {
  if (plan !== 'free') return null
  return (
    <a
      href="https://kita2u.com/?ref=badge"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider"
      style={{ background: '#0A0A0A', color: '#FFFFFF', border: '1px solid #0A0A0A' }}
    >
      Made with{' '}
      <span>
        <span style={{ color: '#FFFFFF' }}>Kita</span>
        <span style={{ color: '#FACC15' }}>2u</span>
      </span>
    </a>
  )
}
