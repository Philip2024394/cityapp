'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, Flame, DollarSign, Package } from 'lucide-react'

const ITEMS = [
  { href: '/dashboard',           label: 'Home',     icon: LayoutDashboard },
  { href: '/dashboard/hotspots',  label: 'Hotspots', icon: Flame },
  { href: '/profile',             label: 'Profile',  icon: User },
  { href: '/pricing',             label: 'Pricing',  icon: DollarSign },
  { href: '/services',            label: 'Services', icon: Package },
]

export default function DashboardNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-auto max-w-3xl px-3 pb-3">
        <div className="glass-strong rounded-3xl px-2 py-2 shadow-card">
          <div className="flex items-center justify-around">
            {ITEMS.map(item => {
              const Icon = item.icon
              const active = path === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl transition"
                  style={{
                    background: active ? 'rgba(250,204,21,0.10)' : 'transparent',
                    color: active ? '#FACC15' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[11px] font-extrabold tracking-wider uppercase">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
