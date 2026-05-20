'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X as XIcon,
  LayoutDashboard, Bike, User, DollarSign, Package, Flame, Gift, Users,
  IdCard, MessageSquare, ClipboardList, Scale, Star, MapPin, LogOut, Briefcase,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// ============================================================================
// AppDrawer — RIGHT-side slide-in DRIVER navigation.
// Opens from the header burger on driver-area pages only — never on
// customer-facing surfaces. Single-section, driver-tools only.
// ============================================================================

const DRIVER_NAV_ITEMS: ReadonlyArray<{
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}> = [
  { href: '/dashboard',              label: 'Dashboard',          icon: LayoutDashboard },
  { href: '/profile',                label: 'Profile + bike',     icon: User },
  { href: '/pricing',                label: 'Pricing',            icon: DollarSign },
  { href: '/services',               label: 'Services',           icon: Package },
  { href: '/dashboard/hotspots',     label: 'Hotspots',           icon: Flame },
  { href: '/dashboard/refer',        label: 'Refer drivers',      icon: Gift },
  { href: '/dashboard/customers',    label: 'Customer book',      icon: Users },
  { href: '/dashboard/card',         label: 'Business card',      icon: IdCard },
  { href: '/dashboard/templates',    label: 'Quick reply',        icon: MessageSquare },
  { href: '/dashboard/operations',   label: 'Operations log',     icon: ClipboardList },
  { href: '/dashboard/rentals',      label: 'My rentals',         icon: Bike },
  { href: '/business',               label: 'Business contracts', icon: Briefcase },
  { href: '/dashboard/places',       label: 'My places',          icon: MapPin },
  { href: '/dashboard/favourites',   label: 'Favourite places',   icon: Star },
  { href: '/dashboard/legal',        label: 'Legal requirements', icon: Scale },
]

export default function AppDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  async function signOut() {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    await supabase.auth.signOut()
    onClose()
    if (typeof window !== 'undefined') window.location.href = '/'
  }

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-[60] transition-opacity"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />

      {/* Drawer panel — slides from RIGHT */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Driver navigation"
        className="fixed top-0 right-0 bottom-0 z-[70] w-[82%] max-w-[340px] flex flex-col transition-transform"
        style={{
          background: 'rgba(15,15,20,0.97)',
          borderLeft: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.55)',
          backdropFilter: 'blur(12px)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 pt-safe h-14 shrink-0 border-b border-white/08">
          <div className="text-[13px] uppercase tracking-wider font-extrabold text-brand">
            Driver menu
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-ink transition"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Auth chip */}
        <div className="px-4 py-3 border-b border-white/08 shrink-0">
          <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">Signed in as</div>
          <div className="text-[13px] font-bold mt-0.5 truncate">
            {email ?? 'Not signed in'}
          </div>
        </div>

        {/* Driver pages — compact yellow brand buttons with a small black
            icon chip (white lucide icon inside). Active page keeps the
            "ON" pill so the current location is unambiguous. */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1.5">
            {DRIVER_NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = path === item.href || path.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-2.5 p-1 pr-2.5 rounded-lg transition active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
                    color: '#0A0A0A',
                    border: active
                      ? '1px solid rgba(0,0,0,0.55)'
                      : '1px solid rgba(0,0,0,0.20)',
                    boxShadow: active
                      ? '0 4px 12px rgba(250,204,21,0.35), 0 0 0 1.5px rgba(0,0,0,0.15) inset'
                      : '0 2px 6px rgba(250,204,21,0.18)',
                    minHeight: 44,
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background: '#0A0A0A',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.30) inset',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.25} />
                  </span>
                  <span className="text-[13px] font-extrabold flex-1 min-w-0 truncate">
                    {item.label}
                  </span>
                  {active && (
                    <span
                      aria-hidden
                      className="text-[12px] font-extrabold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: '#0A0A0A', color: '#FACC15' }}
                    >
                      ON
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Sign out at the bottom (only when signed in) */}
        {email && (
          <div className="px-3 py-3 border-t border-white/08 shrink-0 pb-safe">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition active:scale-[0.99]"
              style={{
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.30)',
                color: '#F87171',
                minHeight: 44,
              }}
            >
              <LogOut className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              <span className="text-[13px] font-extrabold flex-1 min-w-0">Sign out</span>
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

/** Trigger button — drop into a header to open the drawer. */
export function AppDrawerTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open driver menu"
      className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-white/5 active:scale-95 transition"
    >
      <Menu className="w-5 h-5" strokeWidth={2.5} />
    </button>
  )
}
