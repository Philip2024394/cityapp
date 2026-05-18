'use client'
import Link from 'next/link'
import { Home } from 'lucide-react'

// Minimal app header — brand logo + name on the left, home icon on
// the right. All navigation tabs (Marketplace / Places / Rental /
// Dashboard / Login) live elsewhere; the header just identifies the
// app and provides a one-tap path back to the marketplace.
export default function AppNav() {
  return (
    <header className="sticky top-0 z-40 glass-strong pt-safe">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <img
            src="https://ik.imagekit.io/nepgaxllc/Untitleddasdasdasasd-removebg-preview.png?updatedAt=1779015947714"
            alt=""
            className="h-7 w-auto shrink-0"
            loading="eager"
          />
          <div className="text-[15px] font-extrabold tracking-tight truncate">
            City <span className="gradient-text">Rider</span>
          </div>
        </Link>
        <Link
          href="/"
          aria-label="Home"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-ink hover:bg-white/5 active:scale-95 transition"
        >
          <Home className="w-5 h-5" strokeWidth={2.5} />
        </Link>
      </div>
    </header>
  )
}
