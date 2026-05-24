'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Bike, Handshake, Sparkles, ChevronDown,
  Compass, KeyRound, Palette, Shirt, Wrench,
} from 'lucide-react'

// Header role/category dropdown. Two variants:
//   • variant='join'   — "Become a …" + generic create-account
//   • variant='signin' — "Open dashboard" + generic sign-in
// Background is intentionally solid black (no transparency) for an
// unambiguous "black-tinted" panel against the landing's map background.

type Variant = 'join' | 'signin' | 'combined'

type MenuItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

type Section = { title: string; items: MenuItem[] }

// Both dropdowns are category-only. Each destination page presents
// the "Sign in OR Create account" choice — that auth gate is the right
// place to show those two options, NOT the header dropdown.
//   • Join   → category signup pages (each auth-gates → sign in or create account)
//   • Sign in → category dashboards   (each auth-gates → /login if not signed in)
const JOIN_SECTIONS: Section[] = [
  {
    title: 'Join as',
    items: [
      { label: 'Driver',                href: '/signup?intent=driver', icon: Bike },
      { label: 'Tour Guide',            href: '/tour/list/new',        icon: Compass },
      { label: 'Bike Rental',           href: '/rent/list/new',        icon: KeyRound },
      { label: 'Massage Therapist',     href: '/massage/signup',       icon: Sparkles },
      { label: 'Beautician',            href: '/beautician/signup',    icon: Palette },
      { label: 'Laundry shop',          href: '/laundry/signup',       icon: Shirt },
      { label: 'Handyman (Tukang)',     href: '/handyman/signup',      icon: Wrench },
      { label: 'Partner (hotel/villa)', href: '/partners/signup',      icon: Handshake },
    ],
  },
]

const SIGNIN_SECTIONS: Section[] = [
  {
    title: 'Open dashboard',
    items: [
      { label: 'Driver',            href: '/dashboard',              icon: Bike },
      { label: 'Tour Guide',        href: '/dashboard/tour-guide',   icon: Compass },
      { label: 'Bike Rental',       href: '/dashboard/rentals',      icon: KeyRound },
      { label: 'Massage Therapist', href: '/dashboard/massage',      icon: Sparkles },
      { label: 'Beautician',        href: '/dashboard/beautician',   icon: Palette },
      { label: 'Laundry shop',      href: '/dashboard/laundry',      icon: Shirt },
      { label: 'Handyman',          href: '/dashboard/handyman',     icon: Wrench },
      { label: 'Partner',           href: '/dashboard/partner',      icon: Handshake },
    ],
  },
]

export default function HeaderRoleMenu({
  label,
  variant = 'join',
}: {
  label: string
  variant?: Variant
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const sections =
    variant === 'signin' ? SIGNIN_SECTIONS :
    variant === 'join'   ? JOIN_SECTIONS :
    [...SIGNIN_SECTIONS, ...JOIN_SECTIONS]

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Style choices — solid black panel, yellow accent border, drop shadow.
  const panelStyle: React.CSSProperties = {
    background: '#0A0A0A',
    border: '1px solid rgba(250,204,21,0.25)',
    boxShadow: '0 20px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.85)',
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          variant === 'signin'
            ? 'inline-flex items-center gap-1 text-[13px] font-bold text-muted hover:text-ink px-3 py-1.5 rounded-lg hover:bg-white/5 min-h-[36px]'
            : 'inline-flex items-center gap-1 text-[13px] font-extrabold text-bg bg-brand hover:bg-brand2 px-3 py-1.5 rounded-lg transition min-h-[36px]'
        }
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 w-[260px] rounded-2xl p-2"
          style={panelStyle}
        >
          {sections.map((s, si) => (
            <div key={s.title} className={si > 0 ? 'mt-2 pt-2 border-t border-white/8' : ''}>
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-extrabold text-ink/45">
                {s.title}
              </div>
              {s.items.map((it) => {
                const Icon = it.icon
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] font-bold text-ink hover:bg-brand/15 hover:text-brand transition"
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={2.25} />
                    <span className="flex-1 truncate">{it.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
