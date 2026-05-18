'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutDashboard, MapPin, LogIn, Bike } from 'lucide-react'

export default function AppNav() {
  const path = usePathname()
  return (
    <header className="sticky top-0 z-40 glass-strong pt-safe">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714"
            alt=""
            className="h-7 w-auto"
            loading="eager"
          />
          <div className="text-[15px] font-extrabold tracking-tight">
            City <span className="gradient-text">Rider</span>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          <NavItem href="/"          icon={<Home className="w-4 h-4" />}           label="Marketplace" active={path === '/'} compact />
          <NavItem href="/places"    icon={<MapPin className="w-4 h-4" />}          label="Places"      active={path?.startsWith('/places') ?? false} />
          <NavItem href="/rent"      icon={<Bike className="w-4 h-4" />}            label="Rental"      active={path?.startsWith('/rent') ?? false} />
          <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard"   active={path?.startsWith('/dashboard') ?? false} compact />
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
