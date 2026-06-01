'use client'
// ============================================================================
// DevAccessPanel — quick one-tap impersonation buttons on /login + /signup.
// Renders ONLY when window.location.host is localhost / 127.0.0.1; the
// matching API route refuses non-localhost requests too, so even a
// production build of this file can't leak access.
// ============================================================================

import { useEffect, useState } from 'react'
import { Bike, Car, Truck, Sparkles, Building2 } from 'lucide-react'

type Quick = { slug: string; label: string; vertical: 'bike' | 'car' | 'truck' }

// Seeded demo drivers (per `seed-parcel-b2b.mjs` + earlier audits).
// Bike: 11 active rows. Car / Truck: signups not yet seeded — buttons
// surface as a "create a test account" hint instead.
const QUICK_LINKS: ReadonlyArray<Quick> = [
  { slug: 'andi-yk', label: 'Andi (bike)',  vertical: 'bike' },
  { slug: 'budi-yk', label: 'Budi (bike)',  vertical: 'bike' },
  { slug: 'sari-yk', label: 'Sari (bike)',  vertical: 'bike' },
  { slug: 'joko-yk', label: 'Joko (bike)',  vertical: 'bike' },
  { slug: 'made-yk', label: 'Made (bike)',  vertical: 'bike' },
  { slug: 'wayan-yk', label: 'Wayan (bike)', vertical: 'bike' },
]

export default function DevAccessPanel() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const h = window.location.hostname.toLowerCase()
    setShow(h === 'localhost' || h === '127.0.0.1')
  }, [])

  if (!show) return null

  return (
    <div className="mt-5 w-full max-w-[420px] mx-auto">
      <div
        className="rounded-2xl border border-dashed p-4"
        style={{
          background: '#FFFBEA',
          borderColor: '#FACC15',
        }}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#854D0E] mb-2">
          <Sparkles className="w-3 h-3" strokeWidth={3} />
          Dev access (localhost only)
        </div>
        <p className="text-[12px] text-[#854D0E]/80 leading-snug mb-3">
          Skip OTP — tap a seeded driver to drop straight into their
          dashboard. Uses a localhost-only cookie; the matching API
          refuses requests outside localhost.
        </p>

        <div className="grid grid-cols-1 gap-1.5">
          {QUICK_LINKS.map((q) => (
            <a
              key={q.slug}
              href={`/api/dev/impersonate?slug=${encodeURIComponent(q.slug)}`}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-[#FACC15] text-[#0A0A0A] text-[13px] font-extrabold active:scale-[0.99] hover:bg-[#FFFBEA] transition"
              style={{ minHeight: 44 }}
            >
              <VehicleIcon vertical={q.vertical} />
              <span className="flex-1 truncate text-left">{q.label}</span>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#EAB308]">
                Open dashboard →
              </span>
            </a>
          ))}
        </div>

        {/* Partner dashboard quick-link — impersonates the seeded
            philip-ofarrell partner row owner so the founder can verify the
            partner UI without sending a real phone OTP. */}
        <a
          href="/api/dev/impersonate?partner=philip-ofarrell"
          className="mt-3 inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-[#FACC15] text-[#0A0A0A] text-[13px] font-extrabold active:scale-[0.99] hover:bg-[#FFFBEA] transition w-full"
          style={{ minHeight: 44 }}
        >
          <span
            aria-hidden
            className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: '#FACC15', color: '#0A0A0A' }}
          >
            <Building2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          </span>
          <span className="flex-1 truncate text-left">Partner dashboard (Philip)</span>
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#EAB308]">
            Open →
          </span>
        </a>

        <div className="mt-3 pt-3 border-t border-[#FACC15]/40 grid grid-cols-3 gap-1.5">
          <a
            href="/dashboard/rider"
            className="text-center px-2 py-2 rounded-lg bg-white border border-[#E4E4E7] text-[11px] font-extrabold text-[#0A0A0A] hover:border-[#FACC15] transition"
            style={{ minHeight: 36 }}
          >
            🛵 Rider
          </a>
          <a
            href="/dashboard/car"
            className="text-center px-2 py-2 rounded-lg bg-white border border-[#E4E4E7] text-[11px] font-extrabold text-[#0A0A0A] hover:border-[#FACC15] transition"
            style={{ minHeight: 36 }}
          >
            🚗 Car
          </a>
          <a
            href="/dashboard/truck"
            className="text-center px-2 py-2 rounded-lg bg-white border border-[#E4E4E7] text-[11px] font-extrabold text-[#0A0A0A] hover:border-[#FACC15] transition"
            style={{ minHeight: 36 }}
          >
            🚚 Truck
          </a>
        </div>
        <p className="mt-2 text-[10.5px] text-[#854D0E]/70 leading-snug text-center">
          Direct links (you&apos;ll hit auth gate unless impersonated above).
        </p>
      </div>
    </div>
  )
}

function VehicleIcon({ vertical }: { vertical: 'bike' | 'car' | 'truck' }) {
  const Icon = vertical === 'bike' ? Bike : vertical === 'car' ? Car : Truck
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg"
      style={{ background: '#FACC15', color: '#0A0A0A' }}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
    </span>
  )
}
