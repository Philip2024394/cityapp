'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Menu, X as XIcon,
  LayoutDashboard, Bike, User, DollarSign, Package, Flame, Gift, Users,
  IdCard, MessageSquare, ClipboardList, Scale, Star, LogOut, Briefcase,
  Handshake, QrCode,
  Clock, AlertTriangle, CheckCircle2, ListChecks, Wallet,
  Sparkles, Store, UserCog,
  Compass, Map, KeyRound, Palette, Shirt, Wrench,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

// ============================================================================
// AppDrawer — RIGHT-side slide-in navigation.
// Two variants — pass `variant='driver'` (default) for the driver toolkit
// or `variant='partner'` to expose the (much smaller) partner-program
// surface only. Used by AppNav based on the route it's mounted on.
// ============================================================================

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  external?: boolean
}

const DRIVER_NAV_ITEMS: ReadonlyArray<NavItem> = [
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
  { href: '/dashboard/favourites',   label: 'Favourite places',   icon: Star },
  { href: '/dashboard/legal',        label: 'Legal requirements', icon: Scale },
]

const PARTNER_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard/partner',                          label: 'Partner dashboard',  icon: LayoutDashboard },
  { href: '/dashboard/partner/bookings?status=pending',  label: 'Pending bookings',   icon: Clock },
  { href: '/dashboard/partner/bookings?status=overdue',  label: 'Overdue bookings',   icon: AlertTriangle },
  { href: '/dashboard/partner/bookings?status=settled',  label: 'Settled bookings',   icon: CheckCircle2 },
  { href: '/dashboard/partner/bookings?status=all',      label: 'All bookings',       icon: ListChecks },
  { href: '/dashboard/partner/payout',                   label: 'Payout details',     icon: Wallet },
  { href: '/partners',                                   label: 'Program overview',   icon: Handshake },
  { href: '/partners/signup',                            label: 'Register new venue', icon: QrCode },
]

const MASSAGE_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard/massage', label: 'Therapist dashboard', icon: UserCog },
  { href: '/massage',           label: 'Marketplace',         icon: Store },
  { href: '/massage/signup',    label: 'Register therapist',  icon: Sparkles },
]

const BEAUTICIAN_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard/beautician', label: 'Beautician dashboard', icon: UserCog },
  { href: '/beautician',           label: 'Marketplace',          icon: Store },
  { href: '/beautician/signup',    label: 'Register beautician',  icon: Palette },
]

const LAUNDRY_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard/laundry', label: 'Laundry dashboard', icon: UserCog },
  { href: '/laundry',           label: 'Marketplace',       icon: Store },
  { href: '/laundry/signup',    label: 'Register laundry',  icon: Shirt },
]

const HANDYMAN_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard/handyman', label: 'Tukang dashboard', icon: UserCog },
  { href: '/handyman',           label: 'Marketplace',      icon: Store },
  { href: '/handyman/signup',    label: 'Register tukang',  icon: Wrench },
]

const TOUR_GUIDE_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard/tour-guide', label: 'Tour Guide dashboard', icon: Compass },
  { href: '/tour',                 label: 'Tour marketplace',     icon: Map },
  { href: '/tour/list/new',        label: 'List a new tour',      icon: Sparkles },
]

const RENTAL_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard/rentals',  label: 'Rental dashboard',  icon: KeyRound },
  { href: '/rent',               label: 'Rental marketplace', icon: Store },
  { href: '/rent/list/new',      label: 'List a new bike',   icon: Sparkles },
]

type Variant = 'driver' | 'partner' | 'massage' | 'beautician' | 'laundry' | 'handyman' | 'tour-guide' | 'rentals'
const VARIANT_TITLE: Record<Variant, string> = {
  driver:        'Driver menu',
  partner:       'Partner menu',
  massage:       'Therapist menu',
  beautician:    'Beautician menu',
  laundry:       'Laundry menu',
  handyman:      'Tukang menu',
  'tour-guide':  'Tour Guide menu',
  rentals:       'Rental owner menu',
}
const VARIANT_LABEL: Record<Variant, string> = {
  driver:        'Driver navigation',
  partner:       'Partner navigation',
  massage:       'Therapist navigation',
  beautician:    'Beautician navigation',
  laundry:       'Laundry navigation',
  handyman:      'Tukang navigation',
  'tour-guide':  'Tour Guide navigation',
  rentals:       'Rental owner navigation',
}

export default function AppDrawer({
  open,
  onClose,
  variant = 'driver',
}: {
  open: boolean
  onClose: () => void
  variant?: Variant
}) {
  const path = usePathname()
  const searchParams = useSearchParams()
  const currentSearch = searchParams?.toString() ?? ''
  const [email, setEmail] = useState<string | null>(null)
  const items =
    variant === 'partner'      ? PARTNER_NAV_ITEMS :
    variant === 'massage'      ? MASSAGE_NAV_ITEMS :
    variant === 'beautician'   ? BEAUTICIAN_NAV_ITEMS :
    variant === 'laundry'      ? LAUNDRY_NAV_ITEMS :
    variant === 'handyman'     ? HANDYMAN_NAV_ITEMS :
    variant === 'tour-guide'   ? TOUR_GUIDE_NAV_ITEMS :
    variant === 'rentals'      ? RENTAL_NAV_ITEMS :
    DRIVER_NAV_ITEMS

  // Active match supports hrefs with query strings. Path piece must match
  // (or be a prefix), and if the item carries a `?…` the current location's
  // query string must contain those params. Lets us highlight the right
  // bookings filter when multiple items share /dashboard/partner/bookings.
  function isActive(href: string): boolean {
    const [hrefPath, hrefQs = ''] = href.split('?')
    const pathOk = path === hrefPath || path.startsWith(hrefPath + '/')
    if (!pathOk) return false
    if (!hrefQs) return true
    const want = new URLSearchParams(hrefQs)
    const have = new URLSearchParams(currentSearch)
    for (const [k, v] of want.entries()) {
      if (have.get(k) !== v) return false
    }
    return true
  }

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
        aria-label={VARIANT_LABEL[variant]}
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
            {VARIANT_TITLE[variant]}
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
            {items.map((item) => {
              const Icon = item.icon
              const active = !item.external && isActive(item.href)
              const sharedClass = 'flex items-center gap-2.5 p-1 pr-2.5 rounded-lg transition active:scale-[0.99]'
              const sharedStyle = {
                background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
                color: '#0A0A0A',
                border: active
                  ? '1px solid rgba(0,0,0,0.55)'
                  : '1px solid rgba(0,0,0,0.20)',
                boxShadow: active
                  ? '0 4px 12px rgba(250,204,21,0.35), 0 0 0 1.5px rgba(0,0,0,0.15) inset'
                  : '0 2px 6px rgba(250,204,21,0.18)',
                minHeight: 44,
              }
              const inner = (
                <>
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
                </>
              )
              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={sharedClass}
                    style={sharedStyle}
                  >
                    {inner}
                  </a>
                )
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={sharedClass}
                  style={sharedStyle}
                >
                  {inner}
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
export function AppDrawerTrigger({
  onClick,
  variant = 'driver',
}: {
  onClick: () => void
  variant?: Variant
}) {
  const label =
    variant === 'partner'    ? 'Open partner menu' :
    variant === 'massage'    ? 'Open therapist menu' :
    variant === 'beautician' ? 'Open beautician menu' :
    variant === 'laundry'    ? 'Open laundry menu' :
    variant === 'handyman'   ? 'Open tukang menu' :
    variant === 'tour-guide' ? 'Open tour guide menu' :
    variant === 'rentals'    ? 'Open rental owner menu' :
    'Open driver menu'
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-white/5 active:scale-95 transition"
    >
      <Menu className="w-5 h-5" strokeWidth={2.5} />
    </button>
  )
}
