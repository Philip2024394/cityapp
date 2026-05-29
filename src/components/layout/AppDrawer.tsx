'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Menu, X as XIcon,
  LayoutDashboard, Bike, User, DollarSign, Package, Flame, Users,
  IdCard, MessageSquare, Star, LogOut,
  Handshake, QrCode,
  Clock, AlertTriangle, CheckCircle2, ListChecks, Wallet,
  Sparkles, Store, UserCog,
  Compass, Map, KeyRound, Palette, Shirt, Wrench, Brush, Pencil, Layers,
  Globe2, ExternalLink, Calendar,
  CreditCard, HelpCircle, FileText, ShieldCheck,
  Car,
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

// Sectioned nav — used by beautician (and any future variant) to group
// items under section headers. Flat NavItem[] is normalised to a single
// header-less section at render time so the existing variants keep
// working without change.
type NavSection = {
  header?: string
  items: ReadonlyArray<NavItem>
}

const DRIVER_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard',              label: 'Dashboard',          icon: LayoutDashboard },
  { href: '/profile',                label: 'Profile + bike',     icon: User },
  { href: '/dashboard/pricing',      label: 'Pricing',            icon: DollarSign },
  { href: '/services',               label: 'Services',           icon: Package },
  { href: '/dashboard/hotspots',     label: 'Hotspots',           icon: Flame },
  { href: '/dashboard/customers',    label: 'Customer book',      icon: Users },
  { href: '/dashboard/card',         label: 'Business card',      icon: IdCard },
  { href: '/dashboard/templates',    label: 'Quick reply',        icon: MessageSquare },
  { href: '/dashboard/rentals',      label: 'My rentals',         icon: Bike },
  { href: '/dashboard/favourites',   label: 'Favourite places',   icon: Star },
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

const BEAUTICIAN_NAV_SECTIONS: ReadonlyArray<NavSection> = [
  {
    header: 'My profile',
    items: [
      { href: '/dashboard/beautician',      label: 'Beautician dashboard', icon: UserCog },
      { href: '/dashboard/beautician/info', label: 'Profile info',         icon: User },
      { href: '/dashboard/beautician/edit', label: 'Page design',          icon: Pencil },
    ],
  },
  {
    header: 'Bookings & services',
    items: [
      { href: '/dashboard/beautician/services', label: 'Services & prices', icon: Layers },
      { href: '/dashboard/beautician/bookings', label: 'Bookings',          icon: Calendar },
      { href: '/dashboard/beautician/orders',   label: 'Cart orders',       icon: Package },
    ],
  },
  {
    header: 'Payments',
    items: [
      { href: '/dashboard/beautician/payments', label: 'Accept payments', icon: CreditCard },
    ],
  },
  {
    header: 'Marketing',
    items: [
      { href: '/dashboard/beautician/promos', label: 'Promo pages',  icon: Sparkles },
      { href: '/dashboard/beautician/qr',     label: 'Profile QR',   icon: QrCode },
      { href: '/dashboard/beautician/stats',  label: 'Stats',        icon: Flame },
    ],
  },
  {
    header: 'Trust & legal',
    items: [
      { href: '/dashboard/beautician/faq',     label: 'FAQ',                 icon: HelpCircle },
      { href: '/dashboard/beautician/terms',   label: 'Terms & conditions',  icon: FileText },
      { href: '/dashboard/beautician/privacy', label: 'Privacy policy',      icon: ShieldCheck },
    ],
  },
  {
    header: 'More',
    items: [
      { href: '/dashboard/beautician/domain', label: 'Buy custom domain',   icon: Globe2 },
      { href: '/beautician',                  label: 'Marketplace',         icon: Store },
      { href: '/beautician/signup',           label: 'Register beautician', icon: Palette },
    ],
  },
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

const HOME_CLEAN_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard/home-clean', label: 'Cleaner dashboard',  icon: UserCog },
  { href: '/home-clean',           label: 'Marketplace',        icon: Store },
  { href: '/home-clean/signup',    label: 'Register cleaner',   icon: Brush },
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

// Car driver dashboard — multi-page structure matching beautician's
// pattern. Replaces the single 1,354-line /dashboard/car monolith. Note:
// "Accept payments" deliberately means the methods the driver accepts
// directly (cash/QR/transfer) — NOT platform-collected Stripe/Midtrans
// for ride fares, which is forbidden per Permenhub 118/2018 (see the
// policy comment at the top of src/app/cari/page.tsx).
const CAR_DRIVER_NAV_SECTIONS: ReadonlyArray<NavSection> = [
  {
    header: 'My profile',
    items: [
      { href: '/dashboard/car',         label: 'Driver dashboard', icon: UserCog },
      { href: '/dashboard/car/info',    label: 'Profile info',     icon: User },
      { href: '/dashboard/car/edit',    label: 'Page design',      icon: Pencil },
      { href: '/dashboard/car/vehicle', label: 'Vehicle details',  icon: Car },
    ],
  },
  {
    header: 'Services & pricing',
    items: [
      { href: '/dashboard/car/services',     label: 'Services & rates', icon: Layers },
      { href: '/dashboard/car/payments',     label: 'Payment methods',  icon: CreditCard },
      { href: '/dashboard/car/subscription', label: 'Subscription',     icon: Wallet },
    ],
  },
  {
    header: 'Growth',
    items: [
      { href: '/dashboard/car/stats',  label: 'Stats',       icon: Flame },
      { href: '/dashboard/car/qr',     label: 'Profile QR',  icon: QrCode },
      { href: '/dashboard/car/social', label: 'Social posts', icon: Sparkles },
    ],
  },
  {
    header: 'Trust & legal',
    items: [
      { href: '/dashboard/car/faq',     label: 'FAQ',                 icon: HelpCircle },
      { href: '/dashboard/car/terms',   label: 'Terms & conditions',  icon: FileText },
      { href: '/dashboard/car/privacy', label: 'Privacy policy',      icon: ShieldCheck },
    ],
  },
  {
    header: 'More',
    items: [
      { href: '/car',          label: 'Marketplace',     icon: Store },
      { href: '/drivers/car',  label: 'Drivers landing', icon: ExternalLink },
    ],
  },
]

// Bike-rider dashboard — sibling of CAR_DRIVER_NAV_SECTIONS but scoped
// to bike drivers (vehicle_type='bike'). Same yellow brand, same drawer
// structure; differs from car-driver only in label wording ("Bike
// details" instead of "Vehicle details") and the public link target.
const RIDER_NAV_SECTIONS: ReadonlyArray<NavSection> = [
  {
    header: 'My profile',
    items: [
      { href: '/dashboard/rider',         label: 'Rider dashboard',  icon: UserCog },
      { href: '/dashboard/rider/info',    label: 'Profile info',     icon: User },
      { href: '/dashboard/rider/edit',    label: 'Page design',      icon: Pencil },
      { href: '/dashboard/rider/vehicle', label: 'Bike details',     icon: Bike },
    ],
  },
  {
    header: 'Services & pricing',
    items: [
      { href: '/dashboard/rider/services',     label: 'Services & rates', icon: Layers },
      { href: '/dashboard/rider/payments',     label: 'Payment methods',  icon: CreditCard },
      { href: '/dashboard/rider/subscription', label: 'Subscription',     icon: Wallet },
    ],
  },
  {
    header: 'Growth',
    items: [
      { href: '/dashboard/rider/stats',  label: 'Stats',        icon: Flame },
      { href: '/dashboard/rider/qr',     label: 'Profile QR',   icon: QrCode },
      { href: '/dashboard/rider/social', label: 'Social posts', icon: Sparkles },
    ],
  },
  {
    header: 'Trust & legal',
    items: [
      { href: '/dashboard/rider/faq',     label: 'FAQ',                 icon: HelpCircle },
      { href: '/dashboard/rider/terms',   label: 'Terms & conditions',  icon: FileText },
      { href: '/dashboard/rider/privacy', label: 'Privacy policy',      icon: ShieldCheck },
    ],
  },
  {
    header: 'More',
    items: [
      { href: '/cari',     label: 'Booking',         icon: Store },
      { href: '/drivers',  label: 'Drivers landing', icon: ExternalLink },
    ],
  },
]

// Facial + Skincare verticals — clone of beautician's section shape so
// the Trust & legal + Payments groups are present from day one.
const FACIAL_NAV_SECTIONS: ReadonlyArray<NavSection> = [
  {
    header: 'My profile',
    items: [
      { href: '/dashboard/facial',      label: 'Facial dashboard', icon: UserCog },
      { href: '/dashboard/facial/edit', label: 'Page design',      icon: Pencil },
    ],
  },
  {
    header: 'Orders',
    items: [
      { href: '/dashboard/facial/orders', label: 'Cart orders', icon: Package },
    ],
  },
  {
    header: 'Payments',
    items: [
      { href: '/dashboard/facial/payments', label: 'Accept payments', icon: CreditCard },
    ],
  },
  {
    header: 'Trust & legal',
    items: [
      { href: '/dashboard/facial/faq',     label: 'FAQ',                 icon: HelpCircle },
      { href: '/dashboard/facial/terms',   label: 'Terms & conditions',  icon: FileText },
      { href: '/dashboard/facial/privacy', label: 'Privacy policy',      icon: ShieldCheck },
    ],
  },
  {
    header: 'More',
    items: [
      { href: '/facial',         label: 'Marketplace',     icon: Store },
      { href: '/facial/signup',  label: 'Register facial', icon: Sparkles },
    ],
  },
]

const SKINCARE_NAV_SECTIONS: ReadonlyArray<NavSection> = [
  {
    header: 'My profile',
    items: [
      { href: '/dashboard/skincare',      label: 'Skincare dashboard', icon: UserCog },
      { href: '/dashboard/skincare/edit', label: 'Page design',        icon: Pencil },
    ],
  },
  {
    header: 'Orders',
    items: [
      { href: '/dashboard/skincare/orders', label: 'Cart orders', icon: Package },
    ],
  },
  {
    header: 'Payments',
    items: [
      { href: '/dashboard/skincare/payments', label: 'Accept payments', icon: CreditCard },
    ],
  },
  {
    header: 'Trust & legal',
    items: [
      { href: '/dashboard/skincare/faq',     label: 'FAQ',                 icon: HelpCircle },
      { href: '/dashboard/skincare/terms',   label: 'Terms & conditions',  icon: FileText },
      { href: '/dashboard/skincare/privacy', label: 'Privacy policy',      icon: ShieldCheck },
    ],
  },
  {
    header: 'More',
    items: [
      { href: '/skincare',         label: 'Marketplace',       icon: Store },
      { href: '/skincare/signup',  label: 'Register skincare', icon: Sparkles },
    ],
  },
]

type Variant = 'driver' | 'partner' | 'massage' | 'beautician' | 'laundry' | 'handyman' | 'home-clean' | 'tour-guide' | 'rentals' | 'facial' | 'skincare' | 'car-driver' | 'rider'
const VARIANT_TITLE: Record<Variant, string> = {
  driver:        'Driver menu',
  partner:       'Partner menu',
  massage:       'Therapist menu',
  beautician:    'Beautician menu',
  laundry:       'Laundry menu',
  handyman:      'Tukang menu',
  'home-clean':  'Cleaner menu',
  'tour-guide':  'Tour Guide menu',
  rentals:       'Rental owner menu',
  facial:        'Facial menu',
  skincare:      'Skincare menu',
  'car-driver':  'Car driver menu',
  rider:         'Rider menu',
}
const VARIANT_LABEL: Record<Variant, string> = {
  driver:        'Driver navigation',
  partner:       'Partner navigation',
  massage:       'Therapist navigation',
  beautician:    'Beautician navigation',
  laundry:       'Laundry navigation',
  handyman:      'Tukang navigation',
  'home-clean':  'Cleaner navigation',
  'tour-guide':  'Tour Guide navigation',
  rentals:       'Rental owner navigation',
  facial:        'Facial navigation',
  skincare:      'Skincare navigation',
  'car-driver':  'Car driver navigation',
  rider:         'Rider navigation',
}

// Per-variant brand tinting for the nav-item pills. Keep verticals whose
// public profile defaults to yellow (driver/partner/handyman/tour-guide/
// rentals) on the master IndoCity yellow so they stay consistent with
// their public pages. Verticals with non-yellow public defaults
// (beautician=pink, massage=sky, laundry=blue, home-clean=cyan) get
// tinted so the drawer feels coherent with the dashboard they live in.
const VARIANT_BRAND: Record<Variant, {
  /** Gradient start (light end). */ from: string
  /** Gradient end (dark end).   */  to:   string
  /** rgba shadow tint (no alpha — wrap below). */ shadow: string
  /** Foreground text on the pill (ink-on-color). */ ink: string
  /** Active-pill ON badge text color (sits on black). */ onPillText: string
}> = {
  driver:        { from: '#FACC15', to: '#EAB308', shadow: '250,204,21',  ink: '#0A0A0A', onPillText: '#FACC15' },
  partner:       { from: '#FACC15', to: '#EAB308', shadow: '250,204,21',  ink: '#0A0A0A', onPillText: '#FACC15' },
  handyman:      { from: '#FACC15', to: '#EAB308', shadow: '250,204,21',  ink: '#0A0A0A', onPillText: '#FACC15' },
  'tour-guide':  { from: '#FACC15', to: '#EAB308', shadow: '250,204,21',  ink: '#0A0A0A', onPillText: '#FACC15' },
  rentals:       { from: '#FACC15', to: '#EAB308', shadow: '250,204,21',  ink: '#0A0A0A', onPillText: '#FACC15' },
  beautician:    { from: '#F472B6', to: '#DB2777', shadow: '236,72,153',  ink: '#FFFFFF', onPillText: '#F472B6' },
  massage:       { from: '#38BDF8', to: '#0284C7', shadow: '14,165,233',  ink: '#FFFFFF', onPillText: '#38BDF8' },
  laundry:       { from: '#60A5FA', to: '#2563EB', shadow: '59,130,246',  ink: '#FFFFFF', onPillText: '#60A5FA' },
  'home-clean':  { from: '#22D3EE', to: '#0891B2', shadow: '6,182,212',   ink: '#FFFFFF', onPillText: '#22D3EE' },
  facial:        { from: '#F472B6', to: '#DB2777', shadow: '236,72,153',  ink: '#FFFFFF', onPillText: '#F472B6' },
  skincare:      { from: '#F472B6', to: '#DB2777', shadow: '236,72,153',  ink: '#FFFFFF', onPillText: '#F472B6' },
  'car-driver':  { from: '#FACC15', to: '#EAB308', shadow: '250,204,21',  ink: '#0A0A0A', onPillText: '#FACC15' },
  rider:         { from: '#FACC15', to: '#EAB308', shadow: '250,204,21',  ink: '#0A0A0A', onPillText: '#FACC15' },
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
  // Normalize: every variant renders as NavSection[]. Flat arrays become
  // a single header-less section so the rendering branch stays uniform.
  const sections: ReadonlyArray<NavSection> =
    variant === 'partner'      ? [{ items: PARTNER_NAV_ITEMS }] :
    variant === 'massage'      ? [{ items: MASSAGE_NAV_ITEMS }] :
    variant === 'beautician'   ? BEAUTICIAN_NAV_SECTIONS :
    variant === 'laundry'      ? [{ items: LAUNDRY_NAV_ITEMS }] :
    variant === 'handyman'     ? [{ items: HANDYMAN_NAV_ITEMS }] :
    variant === 'home-clean'   ? [{ items: HOME_CLEAN_NAV_ITEMS }] :
    variant === 'tour-guide'   ? [{ items: TOUR_GUIDE_NAV_ITEMS }] :
    variant === 'rentals'      ? [{ items: RENTAL_NAV_ITEMS }] :
    variant === 'facial'       ? FACIAL_NAV_SECTIONS :
    variant === 'skincare'     ? SKINCARE_NAV_SECTIONS :
    variant === 'car-driver'   ? CAR_DRIVER_NAV_SECTIONS :
    variant === 'rider'        ? RIDER_NAV_SECTIONS :
                                 [{ items: DRIVER_NAV_ITEMS }]

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
          background: 'rgba(0,0,0,0.40)',
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
          background: '#ffffff',
          borderLeft: '1px solid rgb(229,231,235)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.18)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 pt-safe h-14 shrink-0 border-b border-gray-200">
          <div className="text-[13px] uppercase tracking-wider font-extrabold text-[#0F172A]">
            {VARIANT_TITLE[variant]}
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-gray-600 hover:text-[#0F172A] transition"
            style={{ background: 'rgb(243,244,246)', border: '1px solid rgb(229,231,235)' }}
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Auth chip */}
        <div className="px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="text-[12px] uppercase tracking-wider font-extrabold text-gray-500">Signed in as</div>
          <div className="text-[13px] font-bold mt-0.5 truncate text-[#0F172A]">
            {email ?? 'Not signed in'}
          </div>
        </div>

        {/* Nav items — per-variant brand gradient (see VARIANT_BRAND).
            Driver/partner/handyman/tour-guide/rentals stay yellow to
            match their public profile defaults; beautician/massage/
            laundry/home-clean tint to their own brand. Section headers
            (when present) split the list into logical groups; 8px gap
            between adjacent buttons keeps every tap target's 44px touch
            box clear of its neighbour's per WCAG 2.5.5. */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {sections.map((section, sIdx) => (
            <div key={section.header ?? `s-${sIdx}`}>
              {section.header && (
                <div className="px-1 mb-2 text-[11px] uppercase tracking-[0.08em] font-extrabold text-gray-500">
                  {section.header}
                </div>
              )}
              <div className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = !item.external && isActive(item.href)
                  const brand = VARIANT_BRAND[variant]
                  const sharedClass = 'flex items-center gap-2.5 p-1 pr-2.5 rounded-lg transition active:scale-[0.99]'
                  const sharedStyle = {
                    background: `linear-gradient(135deg, ${brand.from} 0%, ${brand.to} 100%)`,
                    color: brand.ink,
                    border: active
                      ? '1px solid rgba(0,0,0,0.55)'
                      : '1px solid rgba(0,0,0,0.20)',
                    boxShadow: active
                      ? `0 4px 12px rgba(${brand.shadow},0.35), 0 0 0 1.5px rgba(0,0,0,0.15) inset`
                      : `0 2px 6px rgba(${brand.shadow},0.22)`,
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
                          style={{ background: '#0A0A0A', color: brand.onPillText }}
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
            </div>
          ))}
        </nav>

        {/* Sign out at the bottom (only when signed in) */}
        {email && (
          <div className="px-3 py-3 border-t border-gray-200 shrink-0 pb-safe">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition active:scale-[0.99]"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.30)',
                color: '#DC2626',
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
    variant === 'home-clean' ? 'Open cleaner menu' :
    variant === 'tour-guide' ? 'Open tour guide menu' :
    variant === 'rentals'    ? 'Open rental owner menu' :
    variant === 'facial'     ? 'Open facial menu' :
    variant === 'skincare'   ? 'Open skincare menu' :
    variant === 'car-driver' ? 'Open car driver menu' :
    variant === 'rider'      ? 'Open rider menu' :
    'Open driver menu'
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[#0F172A] hover:bg-gray-100 active:scale-95 transition"
    >
      <Menu className="w-5 h-5" strokeWidth={2.5} />
    </button>
  )
}
