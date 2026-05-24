'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useState } from 'react'
import {
  Bike, Handshake, Sparkles, ChevronDown, X as XIcon,
  Compass, KeyRound, Palette, Shirt, Wrench, Brush,
} from 'lucide-react'

// Header role/category picker.
//
// Two variants:
//   • variant='join'   — "Become a …" → list of category signup pages
//                        (each destination auth-gates → sign in or create account)
//   • variant='signin' — "Open dashboard" → list of category dashboards
//                        (each destination auth-gates → /login if signed out)
//
// UX shape: right-side slide-in drawer with brand-yellow tile buttons —
// same shape as the in-app AppDrawer. Previously this was a 260px
// dropdown panel that cropped on shorter viewports (Home Clean + Handyman
// fell below the fold). Drawer eliminates the cropping entirely and
// gives every category equal visual weight.

type Variant = 'join' | 'signin' | 'combined'

type MenuItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

type Section = { title: string; items: MenuItem[] }

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
      { label: 'Home Clean',            href: '/home-clean/signup',    icon: Brush },
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
      { label: 'Home Clean',        href: '/dashboard/home-clean',   icon: Brush },
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
  const sections =
    variant === 'signin' ? SIGNIN_SECTIONS :
    variant === 'join'   ? JOIN_SECTIONS :
    [...SIGNIN_SECTIONS, ...JOIN_SECTIONS]

  // Lock body scroll while drawer is open. Esc closes.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const titleText = variant === 'signin' ? 'Open your dashboard' : 'Join City Rider'

  return (
    <>
      {/* Trigger pill (kept as-is so the header layout doesn't shift). */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
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

      {/* Scrim — click anywhere to close. */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className="fixed inset-0 z-[60] transition-opacity"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />

      {/* Right-side drawer panel — matches AppDrawer's geometry. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={titleText}
        className="fixed top-0 right-0 bottom-0 z-[70] w-[82%] max-w-[340px] flex flex-col transition-transform"
        style={{
          background: 'rgba(15,15,20,0.97)',
          borderLeft: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.55)',
          backdropFilter: 'blur(12px)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header — title + close. */}
        <div className="flex items-center justify-between gap-3 px-4 pt-safe h-14 shrink-0 border-b border-white/08">
          <div className="text-[13px] uppercase tracking-wider font-extrabold text-brand">
            {titleText}
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Yellow brand-tile items — same shape as AppDrawer entries. */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 pb-safe">
          {sections.map((s, si) => (
            <div key={s.title} className={si > 0 ? 'mt-4' : ''}>
              {sections.length > 1 && (
                <div className="px-2 pb-2 text-[10px] uppercase tracking-wider font-extrabold text-ink/45">
                  {s.title}
                </div>
              )}
              <div className="space-y-1.5">
                {s.items.map((it) => {
                  const Icon = it.icon
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 p-1 pr-2.5 rounded-lg transition active:scale-[0.99]"
                      style={{
                        background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
                        color: '#0A0A0A',
                        border: '1px solid rgba(0,0,0,0.20)',
                        boxShadow: '0 2px 6px rgba(250,204,21,0.18)',
                        minHeight: 44,
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: '#0A0A0A', boxShadow: '0 1px 4px rgba(0,0,0,0.30) inset' }}
                      >
                        <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.25} />
                      </span>
                      <span className="text-[13px] font-extrabold flex-1 min-w-0 truncate">
                        {it.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
