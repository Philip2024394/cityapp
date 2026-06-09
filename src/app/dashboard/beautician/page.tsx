'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Camera, Sparkles, Palette, Link2, CheckCircle2, Clock, Copy, Download } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import PWAInstallCard from '@/components/dashboard/PWAInstallCard'
import ProviderRenewBanner from '@/components/upgrade/ProviderRenewBanner'
import StatusPulse from '@/components/dashboard/StatusPulse'
import WeeklyHoursEditor from '@/components/dashboard/WeeklyHoursEditor'
import UniversalProfileExtrasEditor from '@/components/dashboard/UniversalProfileExtrasEditor'
import ProfileViewsChart from '@/components/dashboard/ProfileViewsChart'
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

type AnalyticsPayload = {
  plan: 'free' | 'pro' | 'studio'
  retentionDays: number
  series: Array<{ day: string; views: number }>
  totalViews: number
}

export default function BeauticianDashboardPage() {
  const [provider, setProvider] = useState<FullProvider | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState<string | null>(null)
  const [copied,   setCopied]   = useState(false)
  // Task 12/12 — plan-gated profile-view analytics. Free sees 28 days,
  // Pro / Studio sees 365. Render null when the call errors so the
  // rest of the dashboard stays intact.
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)

  // Task 11/12 — Studio tier multi-location: when the user owns more
  // than one beautician page, the active page is selected via the
  // `?slug=` query param (set by BeauticianPageSwitcher) and persisted
  // to localStorage so reloads stay on the chosen page. Reading the
  // URL + storage directly keeps this client-side without forcing the
  // whole page into a Suspense boundary.
  const ACTIVE_SLUG_KEY = 'beautician.activeSlug'
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      let activeSlug: string | null = null
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        const fromQuery = url.searchParams.get('slug')
        const fromStore = window.localStorage.getItem(ACTIVE_SLUG_KEY)
        activeSlug = fromQuery || fromStore || null
        if (fromQuery) {
          try { window.localStorage.setItem(ACTIVE_SLUG_KEY, fromQuery) } catch { /* private mode */ }
        }
      }
      const qs = activeSlug ? `?slug=${encodeURIComponent(activeSlug)}` : ''
      const r = await fetch(`/api/beautician/me${qs}`, { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: FullProvider | null }
      setProvider(j.provider)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  // Fire-and-forget analytics fetch. Never blocks the dashboard render —
  // if it errors we just keep analytics === null and skip the chart.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/beautician/me/analytics', { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json() as AnalyticsPayload
        if (!cancelled) setAnalytics(j)
      } catch { /* leave analytics null on error */ }
    })()
    return () => { cancelled = true }
  }, [])

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
  // First-time visitor with a signed-in user but no provider row yet
  // skips the dead-end "Not a beautician yet" gate and lands directly
  // on the upload-profile form so account creation flows straight into
  // setup. Founder direction 2026-06-09: never show a gate page when
  // we can route the user to the next useful step instead.
  if (!provider) {
    if (typeof window !== 'undefined') {
      window.location.replace('/beautician/signup')
    }
    return <Shell><div className="px-4 pt-6 text-black/70 text-[14px]">Loading…</div></Shell>
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

  const totalSteps   = 3
  const doneSteps    = [infoDone, servicesDone, designDone].filter(Boolean).length
  const pct          = Math.round((doneSteps / totalSteps) * 100)
  const firstName    = provider.display_name.split(' ')[0] || 'there'

  // Accent palette derived from the creator's chosen public-profile
  // theme_color. The dashboard adopts the same hex on every CTA, icon
  // chip, progress bar, and hover state so the editor reads as "your
  // workspace, in your brand". Fallback #FACC15 (Kita2u yellow) when
  // no theme_color is set yet — every vertical starts yellow and the
  // creator picks their own from the dashboard color palette later.
  //
  // Soft / softer variants are inlined as hex+alpha (no color-mix in
  // tailwind arbitrary values yet). Hover state piggybacks on
  // brightness-95 since it doesn't need a separate hex.
  const accent       = provider.theme_color || '#FACC15'
  const accentSoft   = accent + '40'  // ~25% — ring + icon chip bg
  const accentSofter = accent + '1F'  // ~12% — task-card icon background fill
  const accentFaint  = accent + '0F'  // ~6%  — hover row tint

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
      <div
        className="px-4 pt-4 pb-32 max-w-lg mx-auto space-y-4"
        style={{
          // Drive every accent surface in this subtree from the creator's
          // chosen theme_color via CSS variables. See palette derivation
          // above. Reading these via Tailwind arbitrary values keeps the
          // styling source-of-truth in className while still tracking the
          // user's selection at runtime.
          ['--accent' as string]: accent,
          ['--accent-soft' as string]: accentSoft,
          ['--accent-softer' as string]: accentSofter,
          ['--accent-faint' as string]: accentFaint,
        }}
      >
        <PWAInstallCard />
        {/* Greeting + progress */}
        <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            {provider.profile_image_url
              ? <img src={provider.profile_image_url} alt={provider.display_name} className="w-14 h-14 rounded-full object-cover bg-[color:var(--accent-softer)] ring-2 ring-[color:var(--accent-soft)]" />
              : <div className="w-14 h-14 rounded-full bg-[color:var(--accent-softer)] flex items-center justify-center text-[color:var(--accent)] text-[20px] font-black ring-2 ring-[color:var(--accent-soft)]">{provider.display_name[0]?.toUpperCase()}</div>}
            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] font-black text-black truncate leading-tight">Hi, {firstName}! <span aria-hidden>👋</span></h1>
              <p className="text-[13px] text-black/75 mt-0.5">
                {doneSteps === totalSteps
                  ? 'Your profile is complete — looking great!'
                  : `Your profile is ${doneSteps} of ${totalSteps} complete`}
              </p>
            </div>
          </div>
          <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: accent }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[11px] text-black/55 tabular-nums">
              {(provider.visitor_count ?? 0).toLocaleString()} profile {provider.visitor_count === 1 ? 'view' : 'views'}
            </p>
            <p className="text-[11px] text-black/55 tabular-nums">{pct}%</p>
          </div>
        </section>

        {/* Task 12/12 — plan-gated profile-view analytics.
            Free = 28-day window, Pro / Studio = 365-day window.
            Mirrors Linktree's retention tiers at a fraction of the
            price; the Free→Pro upgrade nudge lives in the chart. */}
        {analytics && (
          <ProfileViewsChart
            series={analytics.series}
            retentionDays={analytics.retentionDays}
            plan={analytics.plan}
            totalViews={analytics.totalViews}
            themeColor={accent}
          />
        )}

        {/* Task cards */}
        <div className="space-y-3">
          <TaskCard
            href="/dashboard/beautician/info"
            icon={<Camera size={22} />}
            iconBg="bg-[color:var(--accent-softer)] text-[color:var(--accent)]"
            title="Photo & basic info"
            description="Name, photo, bio, WhatsApp, service area"
            status={infoDone ? 'done' : 'pending'}
          />
          <TaskCard
            href="/dashboard/beautician/services"
            icon={<Sparkles size={22} />}
            iconBg="bg-[color:var(--accent-softer)] text-[color:var(--accent)]"
            title="Services & prices"
            description="Makeup, nail, hair, and more — add photos and set prices"
            status={servicesDone ? 'done' : 'pending'}
          />
          <TaskCard
            href="/dashboard/beautician/edit"
            icon={<Palette size={22} />}
            iconBg="bg-[color:var(--accent-softer)] text-[color:var(--accent)]"
            title="Public page design"
            description="Theme color, banner, title text, and scrolling promo"
            status={designDone ? 'done' : 'pending'}
          />
        </div>

        {/* Share link */}
        <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[color:var(--accent-softer)] text-[color:var(--accent)] flex items-center justify-center"><Link2 size={18} /></div>
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
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[color:var(--accent)] hover:brightness-95 text-white px-3 py-3 text-[13px] font-extrabold min-h-[44px] transition"
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
          {/* WhatsApp Status flyer — templated 1080×1920 PNG generated
              server-side from this profile's data. Native <a download>
              so the browser saves directly to the user's gallery. The
              endpoint is auth-gated and locked to the caller's own row. */}
          <div className="pt-3 mt-1 border-t border-gray-100">
            <a
              href="/api/beautician/me/flyer"
              download="kita2u-flyer.png"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-black hover:bg-gray-800 text-white px-3 py-3 text-[13px] font-extrabold min-h-[44px] transition"
            >
              <Download size={16} /> Download flyer for WhatsApp Status
            </a>
            <p className="text-[11px] text-black/55 mt-2 leading-snug">
              1080×1920 PNG. Share to WhatsApp Status, TikTok, Instagram Stories.
            </p>
          </div>
        </section>

        {/* Weekly opening hours — replaces the manual Online/Busy/Offline
            toggle (founder ask 2026-05-29). Auto-derived status pulse:
            green satellite ping when current time is within today's
            hours, orange dot when outside (or busy). Car + bike rental
            dashboards keep manual toggles since they're "available now
            or not" by nature. */}
        <section className="rounded-3xl bg-white border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] font-bold uppercase tracking-wider text-black/55">My opening hours</div>
            <StatusPulse
              operatingHours={(provider as FullProvider & { operating_hours?: Record<string, string> | null }).operating_hours ?? null}
              busyDates={(provider as FullProvider & { busy_dates?: string[] | null }).busy_dates ?? null}
              busyTimeSlots={(provider as FullProvider & { busy_time_slots?: Array<{ date: string; start_time: string; end_time: string }> | null }).busy_time_slots ?? null}
              size={14}
              showLabel
            />
          </div>
          <WeeklyHoursEditor
            value={(provider as FullProvider & { operating_hours?: Record<string, string> | null }).operating_hours ?? null}
            accentColor={accent}
            onChange={async (next) => {
              setProvider((cur) => cur ? { ...cur, operating_hours: next } : cur)
              try {
                await fetch('/api/beautician/me/profile', {
                  method:  'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body:    JSON.stringify({ operating_hours: next }),
                })
              } catch { /* optimistic; next reload reconciles */ }
            }}
          />
          <ProviderRenewBanner provider={provider} upgradeHref="/beautician/upgrade" />
        </section>

        {/* Universal profile extras — cover, gallery, socials, chat
            handles, contact form, certifications, languages. Mirrors
            the consolidated block shipped to handyman / laundry /
            massage / home-clean dashboards (mig 0072). Optimistic
            local state + debounced POST so each chip / toggle saves
            without a full form submit. */}
        {provider.user_id && (
          <section className="rounded-3xl bg-white border border-gray-200 p-4">
            <UniversalExtrasBlock
              userId={provider.user_id}
              provider={provider}
              onLocal={(patch) => setProvider((cur) => cur ? { ...cur, ...patch } : cur)}
            />
          </section>
        )}
      </div>
    </Shell>
  )
}

// Local state + debounced save wrapper for the shared editor. Keeps
// page.tsx readable while still mirroring the laundry/handyman pattern
// of saving each change as the user types.
function UniversalExtrasBlock({
  userId, provider, onLocal,
}: {
  userId: string
  provider: FullProvider
  onLocal: (patch: Partial<FullProvider>) => void
}) {
  const [f, setF] = useState({
    cover_image_url:      provider.cover_image_url      ?? null,
    gallery_image_urls:   provider.gallery_image_urls   ?? [],
    instagram_url:        provider.instagram_url        ?? null,
    tiktok_url:           provider.tiktok_url           ?? null,
    facebook_url:         provider.facebook_url         ?? null,
    x_url:                provider.x_url                ?? null,
    snapchat_url:         provider.snapchat_url         ?? null,
    website_url:          provider.website_url          ?? null,
    operating_hours:      provider.operating_hours      ?? null,
    certifications:       provider.certifications       ?? [],
    languages:            provider.languages            ?? [],
    contact_form_enabled: Boolean(provider.contact_form_enabled),
    contact_email:        provider.contact_email        ?? null,
  })
  // Debounced commit — same 500ms pattern the /edit page uses for
  // hero_text. Each patch overlays local state, mirrors into the parent
  // provider, then fires once after the user stops typing. Pending
  // changes accumulate in a ref so multiple chip-toggles inside the
  // 500ms window collapse into a single PATCH body.
  const pendingRef = useRef<Record<string, unknown>>({})
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  function applyPatch(patch: Partial<typeof f>) {
    setF((prev) => ({ ...prev, ...patch }))
    onLocal(patch as Partial<FullProvider>)
    Object.assign(pendingRef.current, patch)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const body = pendingRef.current
      pendingRef.current = {}
      try {
        await fetch('/api/beautician/me/profile', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
      } catch { /* optimistic; reload will reconcile */ }
    }, 500)
  }
  return (
    <UniversalProfileExtrasEditor
      userId={userId}
      hideOperatingHours
      value={{
        cover_image_url:    f.cover_image_url,
        gallery_image_urls: f.gallery_image_urls,
        instagram_url:      f.instagram_url,
        tiktok_url:         f.tiktok_url,
        facebook_url:       f.facebook_url,
        x_url:              f.x_url,
        snapchat_url:       f.snapchat_url,
        website_url:        f.website_url,
        operating_hours:    f.operating_hours,
        certifications:     f.certifications,
        languages:          f.languages,
        contact_form_enabled: f.contact_form_enabled,
        contact_email:        f.contact_email,
      }}
      onChange={(patch) => applyPatch(patch as Partial<typeof f>)}
    />
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
      className="block rounded-3xl bg-white border border-gray-200 p-4 shadow-sm hover:border-[color:var(--accent-soft)] hover:bg-gray-50 transition group"
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
        <ChevronRight size={20} className="text-black/40 group-hover:text-[color:var(--accent)] transition flex-shrink-0" />
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
