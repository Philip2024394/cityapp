'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutDashboard, User, LogIn } from 'lucide-react'

export default function AppNav() {
  const path = usePathname()
  return (
    <header className="sticky top-0 z-40 glass-strong pt-safe">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand2 flex items-center justify-center text-bg text-[15px]">🛵</div>
          <div className="text-[15px] font-extrabold tracking-tight">
            City <span className="gradient-text">Rider</span>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          <NavItem href="/"          icon={<Home className="w-4 h-4" />}           label="Marketplace" active={path === '/'} />
          <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard"   active={path?.startsWith('/dashboard') ?? false} />
          <NavItem href="/login"     icon={<LogIn className="w-4 h-4" />}          label="Login"       active={path === '/login'} compact />
        </nav>
      </div>
    </header>
  )
}

function NavItem({ href, icon, label, active, compact }: { href: string; icon: React.ReactNode; label: string; active: boolean; compact?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-bold transition ${
        active ? 'bg-brand/12 text-brand' : 'text-muted hover:text-ink hover:bg-white/5'
      }`}
    >
      {icon}
      <span className={compact ? 'hidden sm:inline' : ''}>{label}</span>
    </Link>
  )
}
