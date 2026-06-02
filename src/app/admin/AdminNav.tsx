'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Shield, Users, History, MapPin, Bike, UserPlus, QrCode, Receipt, Handshake, Megaphone, Activity, Wallet, MessageCircle, CreditCard, Bell, BarChart3 } from 'lucide-react'

const TABS = [
  { href: '/admin',              label: 'Overview',  icon: Shield        },
  { href: '/admin/alerts',       label: 'Alerts',    icon: Bell          },
  { href: '/admin/analytics',    label: 'Analytics', icon: BarChart3     },
  { href: '/admin/outreach',     label: 'Outreach',  icon: Megaphone     },
  { href: '/admin/providers',    label: 'Providers', icon: Handshake     },
  { href: '/admin/members',      label: 'Members',   icon: UserPlus      },
  { href: '/admin/receipts',     label: 'Receipts',  icon: Receipt       },
  { href: '/admin/subscriptions',label: 'Subs',      icon: CreditCard    },
  { href: '/admin/wa-queue',     label: 'WA Queue',  icon: MessageCircle },
  { href: '/admin/wa-intents',   label: 'Intents',   icon: MessageCircle },
  { href: '/admin/qr-codes',     label: 'QR',        icon: QrCode        },
  { href: '/admin/drivers',      label: 'Riders',    icon: Users         },
  { href: '/admin/places',       label: 'Places',    icon: MapPin        },
  { href: '/admin/rentals',      label: 'Rentals',   icon: Bike          },
  { href: '/admin/payouts',      label: 'Payouts',   icon: Wallet        },
  { href: '/admin/health',       label: 'Health',    icon: Activity      },
  { href: '/admin/audit',        label: 'Audit',     icon: History       },
] as const

export default function AdminNav({ adminName }: { adminName: string }) {
  const path = usePathname()
  const [unackedAlerts, setUnackedAlerts] = useState<number>(0)

  // Lazy-load unacked count for the Alerts tab badge. Fire-and-forget;
  // a failure (e.g. /api/admin/alerts not yet deployed) simply leaves
  // the dot off.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/alerts?acknowledged=false&limit=1', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (cancelled || !j) return
        setUnackedAlerts(Number(j.total_unacked ?? 0))
      })
      .catch(() => { /* swallow */ })
    return () => { cancelled = true }
  }, [path])

  return (
    <header className="sticky top-0 z-40 glass-strong pt-safe border-b border-line">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-danger/15 border border-danger/30 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-danger" />
          </div>
          <div className="text-[15px] font-extrabold tracking-tight truncate">
            <span style={{ color: '#0A0A0A' }}>Kita</span><span style={{ color: '#FACC15' }}>2u</span> · <span className="text-danger">Admin</span>
          </div>
        </div>
        <div className="text-[12px] text-muted truncate hidden sm:block">{adminName}</div>
      </div>
      <nav className="max-w-5xl mx-auto px-2 pb-1.5 flex items-center gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = path === t.href || (t.href !== '/admin' && path?.startsWith(t.href))
          const Icon = t.icon
          const showAlertDot = t.href === '/admin/alerts' && unackedAlerts > 0
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold transition ${
                active ? 'bg-brand/12 text-brand' : 'text-muted hover:text-ink hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {showAlertDot && (
                <span
                  aria-label={`${unackedAlerts} unacked alert${unackedAlerts === 1 ? '' : 's'}`}
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                  style={{ background: '#EF4444', boxShadow: '0 0 0 2px rgba(0,0,0,0.85)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
