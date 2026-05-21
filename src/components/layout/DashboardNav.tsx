'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, Flame, DollarSign, Package, Bike, CreditCard } from 'lucide-react'

const DRIVER_ITEMS = [
  { href: '/dashboard',           label: 'Home',     icon: LayoutDashboard },
  { href: '/dashboard/hotspots',  label: 'Hotspots', icon: Flame },
  { href: '/profile',             label: 'Profile',  icon: User },
  { href: '/pricing',             label: 'Pricing',  icon: DollarSign },
  { href: '/services',            label: 'Services', icon: Package },
]

// Rental Bike Company accounts have no driver dashboard — only their
// rental listings, billing (subscription renewal), and profile.
const RENTAL_COMPANY_ITEMS = [
  { href: '/dashboard/rentals',   label: 'Rentals',  icon: Bike },
  { href: '/rent/upgrade',        label: 'Billing',  icon: CreditCard },
  { href: '/profile',             label: 'Profile',  icon: User },
]

export default function DashboardNav() {
  const path = usePathname()
  const [items, setItems] = useState(DRIVER_ITEMS)

  // Fetch account_type once on mount. The default (driver nav) shows
  // immediately so the nav doesn't flicker for the common case.
  useEffect(() => {
    fetch('/api/me/account', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j: { account?: { account_type?: string; subscription_status?: string } | null } | null) => {
        if (j?.account?.account_type === 'rental_company' && j.account.subscription_status === 'active') {
          setItems(RENTAL_COMPANY_ITEMS)
        }
      })
      .catch(() => { /* default nav stays */ })
  }, [])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-auto max-w-3xl px-3 pb-3">
        <div
          className="rounded-3xl px-1.5 py-1.5"
          style={{
            background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
            border: '1px solid rgba(0,0,0,0.20)',
            boxShadow: '0 10px 28px rgba(250,204,21,0.30), 0 0 0 1px rgba(255,255,255,0.20) inset',
          }}
        >
          <div className="flex items-center gap-1">
            {items.map(item => {
              const Icon = item.icon
              const active = path === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-2xl transition whitespace-nowrap overflow-hidden"
                  style={{
                    // Active pill: dark inner contrast against the yellow bar.
                    // Inactive: transparent + near-black text — readable on yellow.
                    background: active ? 'rgba(0,0,0,0.85)' : 'transparent',
                    color:      active ? '#FACC15'         : 'rgba(0,0,0,0.78)',
                    minHeight: 56,
                  }}
                >
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.75 : 2.25} />
                  <span className="text-[12px] font-extrabold leading-none mt-1 truncate max-w-full">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
