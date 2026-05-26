'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Camera, Sparkles, Palette, BadgeCheck, Link2, CheckCircle2, Clock, Copy } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import ProviderRenewBanner from '@/components/upgrade/ProviderRenewBanner'
import {
  type BeauticianProvider,
  type BeauticianAvailability,
  type BeauticianServiceOffered,
  type BeauticianServicePhoto,
  type BeauticianHeroText,
} from '@/lib/beautician/types'

// Beautician dashboard hub — task-card layout for first-time users.
// Each card maps to ONE focused sub-page so users don't see everything
// stacked. Progress strip tells them how much setup is left.
//
//   /info     → basic profile information (name, photo, contact, KTP)
//   /services → services offered + prices + per-service photos
//   /edit     → public-page customisation (theme, banner, hero text,
//               running marquee, effects)


type Extras = {
  cover_image_url?:    string | null
  theme_color?:        string | null
  hero_text?:          BeauticianHeroText | null
  services_offered?:   BeauticianServiceOffered[] | null
  service_photos?:     Partial<Record<BeauticianServiceOffered, BeauticianServicePhoto[]>> | null
  marketplace_categories?: BeauticianServiceOffered[] | null
  visitor_count?:      number | null
}
type FullProvider = BeauticianProvider & Extras

export default function BeauticianDashboardPage() {
  const [provider, setProvider] = useState<FullProvider | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState<string | null>(null)
  const [copied,   setCopied]   = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/beautician/me', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: FullProvider | null }
      setProvider(j.provider)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  async function setAvailability(next: BeauticianAvailability) {
    if (!provider) return
    const prev = provider.availability
    setProvider({ ...provider, availability: next })
    try {
      const r = await fetch('/api/beautician/me/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!j.ok) {
        setProvider({ ...provider, availability: prev })
        alert(j.error === 'not_verified'
          ? 'Awaiting admin verification — Online unlocks once your ID is approved.'
          : 'Could not update status.')
      }
    } catch {
      setProvider({ ...provider, availability: prev })
    }
  }

  if (loading) return <Shell><div className="px-4 pt-6 text-black/70 text-[14px]">Loading…</div></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[22px] font-black text-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/beautician" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }
  if (!provider) {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[22px] font-black text-black mb-2">Not a beautician yet</h1>
          <p className="text-[14px] text-black/70 mb-6">Register to start receiving WhatsApp bookings.</p>
          <Link href="/beautician/signup" className="rounded-full bg-pink-500 text-white px-6 py-3 text-[14px] font-extrabold inline-block">Sign up</Link>
        </div>
      </Shell>
    )
  }

  // Completion logic — each task is "done" when the relevant fields
  // have non-empty content. First-time users see ❍ pending, repeat
  // users see ✓ done so they're not nagged about completed work.
  const infoDone     = Boolean(provider.bio?.trim() && provider.profile_image_url && provider.city)
  const servicesDone = Boolean(
    (provider.services_offered?.length ?? 0) > 0
    || (provider.service_photos && Object.keys(provider.service_photos).length > 0)
    || provider.price_makeup_idr || provider.price_nail_idr || provider.price_hair_idr,
  )
  const designDone   = Boolean(provider.theme_color || provider.cover_image_url || provider.hero_text)
  const ktpDone      = provider.status === 'active'
  const ktpPending   = Boolean(provider.ktp_image_url) && provider.status !== 'active'

  const totalSteps   = 4
  const doneSteps    = [infoDone, servicesDone, designDone, ktpDone].filter(Boolean).length
  const pct          = Math.round((doneSteps / totalSteps) * 100)
  const firstName    = provider.display_name.split(' ')[0] || 'there'

  const publicUrl    = typeof window !== 'undefined'
    ? `${window.location.origin}/beautician/${provider.slug}`
    : `/beautician/${provider.slug}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard may be unavailable */ }
  }

  return (
    <Shell>
      <div className="px-4 pt-4 pb-32 max-w-lg mx-auto space-y-4">
        {/* Greeting + progress */}
        <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            {provider.profile_image_url
              ? <img src={provider.profile_image_url} alt={provider.display_name} className="w-14 h-14 rounded-full object-cover bg-pink-500/20 ring-2 ring-pink-400/40" />
              : <div className="w-14 h-14 rounded-full bg-pink-500/25 flex items-center justify-center text-pink-200 text-[20px] font-black ring-2 ring-pink-400/40">{provider.display_name[0]?.toUpperCase()}</div>}
            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] font-black text-black truncate leading-tight">Hi, {firstName}! <span aria-hidden>👋</span></h1>
              <p className="text-[13px] text-black/75 mt-0.5">
                {doneSteps === totalSteps
                  ? 'Your profile is complete — looking great!'
                  : `Your profile is ${doneSteps} of ${totalSteps} complete`}
              </p>
            </div>
          </div>
          <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[11px] text-black/55 tabular-nums">
              {(provider.visitor_count ?? 0).toLocaleString()} profile {provider.visitor_count === 1 ? 'view' : 'views'}
            </p>
            <p className="text-[11px] text-black/55 tabular-nums">{pct}%</p>
          </div>
        </section>

        {/* Task cards */}
        <div className="space-y-3">
          <TaskCard
            href="/dashboard/beautician/info"
            icon={<Camera size={22} />}
            iconBg="bg-pink-500/25 text-pink-200"
            title="Photo & basic info"
            description="Name, photo, bio, WhatsApp, service area"
            status={infoDone ? 'done' : 'pending'}
          />
          <TaskCard
            href="/dashboard/beautician/services"
            icon={<Sparkles size={22} />}
            iconBg="bg-rose-500/25 text-rose-200"
            title="Services & prices"
            description="Makeup, nail, hair, and more — add photos and set prices"
            status={servicesDone ? 'done' : 'pending'}
          />
          <TaskCard
            href="/dashboard/beautician/edit"
            icon={<Palette size={22} />}
            iconBg="bg-amber-500/25 text-amber-200"
            title="Public page design"
            description="Theme color, banner, title text, and scrolling promo"
            status={designDone ? 'done' : 'pending'}
          />
          <TaskCard
            href="/dashboard/beautician/info"
            icon={<BadgeCheck size={22} />}
            iconBg="bg-emerald-500/25 text-emerald-200"
            title="ID verification (KTP)"
            description={
              ktpDone
                ? 'Your profile is live on the marketplace.'
                : ktpPending
                  ? 'Admin is reviewing — usually within 24 hours.'
                  : 'Upload your ID to appear on the marketplace.'
            }
            status={ktpDone ? 'done' : ktpPending ? 'pending-review' : 'pending'}
          />
        </div>

        {/* Share link */}
        <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-pink-500/25 text-pink-200 flex items-center justify-center"><Link2 size={18} /></div>
            <h2 className="text-[15px] font-black text-black">Share your profile</h2>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
            <div className="text-[12px] text-black/55 uppercase tracking-wider font-bold mb-0.5">Public link</div>
            <div className="text-[13px] font-mono text-black/90 truncate">{publicUrl}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white px-3 py-3 text-[13px] font-extrabold min-h-[44px] transition"
            >
              <Copy size={16} /> {copied ? 'Copied!' : 'Copy link'}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 text-black px-3 py-3 text-[13px] font-extrabold min-h-[44px] transition"
            >
              Open in new tab →
            </a>
          </div>
        </section>

        {/* Availability + trial — kept at the bottom as a small status strip */}
        <section className="rounded-3xl bg-white border border-gray-200 p-4 space-y-3">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-wider text-black/55 mb-2">My status</div>
            <div className="grid grid-cols-3 gap-2">
              {(['online','busy','offline'] as const).map((a) => {
                const active = provider.availability === a
                const labels = { online: 'Online', busy: 'Busy', offline: 'Offline' }
                const colors = active
                  ? a === 'online' ? 'bg-emerald-500 text-white border-emerald-500'
                  : a === 'busy'   ? 'bg-amber-500   text-white border-amber-500'
                  :                  'bg-stone-500   text-white border-stone-500'
                  : 'bg-gray-100 text-black/80 border-gray-200 hover:bg-gray-200'
                return (
                  <button
                    key={a}
                    onClick={() => setAvailability(a)}
                    className={`rounded-xl px-3 py-3 text-[13px] font-extrabold uppercase tracking-wider transition border min-h-[44px] ${colors}`}
                  >
                    {labels[a]}
                  </button>
                )
              })}
            </div>
          </div>
          <ProviderRenewBanner provider={provider} upgradeHref="/beautician/upgrade" />
        </section>
      </div>
    </Shell>
  )
}

function TaskCard({
  href, icon, iconBg, title, description, status,
}: {
  href: string
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  status: 'done' | 'pending' | 'pending-review'
}) {
  return (
    <Link
      href={href}
      className="block rounded-3xl bg-white border border-gray-200 p-4 shadow-sm hover:border-pink-400/60 hover:bg-gray-50 transition group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[15px] font-black text-black truncate">{title}</h3>
            <StatusPill status={status} />
          </div>
          <p className="text-[12.5px] text-black/70 leading-snug line-clamp-2">{description}</p>
        </div>
        <ChevronRight size={20} className="text-black/40 group-hover:text-pink-500 transition flex-shrink-0" />
      </div>
    </Link>
  )
}

function StatusPill({ status }: { status: 'done' | 'pending' | 'pending-review' }) {
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-200 bg-emerald-500/20 border border-emerald-400/40 rounded-full px-2 py-0.5">
        <CheckCircle2 size={11} /> Done
      </span>
    )
  }
  if (status === 'pending-review') {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider text-amber-200 bg-amber-500/20 border border-amber-400/40 rounded-full px-2 py-0.5">
        <Clock size={11} /> Reviewing
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider text-black/55 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
      To do
    </span>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}
