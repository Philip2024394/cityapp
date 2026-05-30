'use client'
// ============================================================================
// /dashboard/rider — Rider (motorbike) dashboard home (redesigned 2026-05-30)
// ----------------------------------------------------------------------------
// First-screen layout (above the fold on a 360x800 phone):
//   1. Compact identity row — biz name, vehicle, city + public link
//   2. AvailabilitySwitcher — big active pill + 2 secondary buttons with a
//      3-second hold-to-confirm gate on Online -> Busy / Online -> Offline
//   3. 2-col coaching grid — Account Health (completeness + share clicks)
//      and Market Position (vs city avg km rate)
//
// Below the fold (still scrollable): subscription banner, KPI strip, the
// six-page grid, secondary nav.
//
// Regulatory posture: this surface NEVER renders Stripe/Midtrans wiring
// for ride fares (Permenhub 118/2018). The "Payment methods" tile
// represents the methods THIS rider accepts directly (cash / QR /
// transfer) — NOT a platform-collected escrow.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, Bike, User, Pencil, Layers, CreditCard, Wallet, Flame,
  Sparkles, HelpCircle, FileText, ShieldCheck, ArrowRight,
  CheckCircle2, AlertTriangle, Clock, MessageCircle, ExternalLink,
  BarChart3, Share2, Map as MapIcon,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import PWAInstallCard from '@/components/dashboard/PWAInstallCard'
import AvailabilitySwitcher from '@/components/dashboard/AvailabilitySwitcher'

const ADMIN_WHATSAPP_E164 = '6285183600015'
const ADMIN_WA_RENEW = `https://wa.me/${ADMIN_WHATSAPP_E164}?text=${encodeURIComponent(
  'Halo admin, saya mau bayar/renew langganan dashboard Rider (Rp 38.000/bulan).',
)}`

// Minimal row shape — overview only reads what the cards need. Full row
// shape with editable fields lives in the subpages that actually edit.
type RiderOverview = {
  user_id: string
  vehicle_type: string | null
  business_name: string | null
  slug: string | null
  city: string | null
  area: string | null
  bike_make: string | null
  bike_model: string | null
  bike_year: number | null
  bike_cc: number | null
  vehicle_photos: string[] | null
  price_per_km: number | null
  min_fee: number | null
  availability: 'online' | 'busy' | 'offline' | null
  paid_until: string | null
  rating: number | null
  rating_count: number | null
  cover_image_url: string | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'wrong_type'; type: string }
  | { kind: 'ready'; row: RiderOverview }
  | { kind: 'error'; message: string }

type SubStatus =
  | { kind: 'never' }
  | { kind: 'expired'; until: string }
  | { kind: 'active'; until: string; daysLeft: number }

function classifySubscription(paidUntil: string | null): SubStatus {
  if (!paidUntil) return { kind: 'never' }
  const today = new Date().toISOString().slice(0, 10)
  if (paidUntil < today) return { kind: 'expired', until: paidUntil }
  const todayMs = Date.parse(today + 'T00:00:00')
  const untilMs = Date.parse(paidUntil + 'T00:00:00')
  const daysLeft = Math.max(0, Math.round((untilMs - todayMs) / 86_400_000))
  return { kind: 'active', until: paidUntil, daysLeft }
}

function formatDateID(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return iso }
}

export default function RiderDashboardHomePage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    // DEV BYPASS — when /api/dev/impersonate has set a cr-dev-uid cookie
    // on localhost, fetch the driver row via /api/dev/driver (which uses
    // the admin client server-side) and render. Skips Supabase auth.
    if (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        const r = await fetch('/api/dev/driver', { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as { driver: RiderOverview | null }
          if (j.driver) {
            const row = j.driver
            if (row.vehicle_type && !['bike'].includes(row.vehicle_type)) {
              setState({ kind: 'wrong_type', type: row.vehicle_type })
              return
            }
            setState({ kind: 'ready', row })
            return
          }
        }
      } catch { /* fall through to normal auth */ }
    }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('drivers')
      .select(
        'user_id, vehicle_type, business_name, slug, city, area, ' +
        'bike_make, bike_model, bike_year, bike_cc, vehicle_photos, ' +
        'price_per_km, min_fee, availability, paid_until, rating, rating_count, cover_image_url',
      )
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { setState({ kind: 'error', message: error.message }); return }
    if (!data) { setState({ kind: 'no_driver' }); return }
    const row = data as unknown as RiderOverview
    if (row.vehicle_type && !['bike'].includes(row.vehicle_type)) {
      setState({ kind: 'wrong_type', type: row.vehicle_type })
      return
    }
    setState({ kind: 'ready', row })
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')      return <FullPageMessage spinner>Loading dashboard…</FullPageMessage>
  if (state.kind === 'no_supabase')  return <FullPageMessage>Auth not configured. Refresh the page.</FullPageMessage>
  if (state.kind === 'unauth')       return <FullPageMessage cta={{ href: '/signup', label: 'Sign in' }}>Sign in to access the rider dashboard.</FullPageMessage>
  if (state.kind === 'no_driver')    return <FullPageMessage cta={{ href: '/signup?role=driver&vehicle=bike', label: 'Create rider profile' }}>No rider profile yet.</FullPageMessage>
  if (state.kind === 'wrong_type')   return <FullPageMessage>This dashboard is for bike riders. Your profile is {state.type}.</FullPageMessage>
  if (state.kind === 'error')        return <FullPageMessage>Could not load profile: {state.message}</FullPageMessage>

  return <DashboardHome row={state.row} onReload={() => void reload()} />
}

// ─── Main composition ────────────────────────────────────────────────

function DashboardHome({ row, onReload }: { row: RiderOverview; onReload: () => void }) {
  const sub = useMemo(() => classifySubscription(row.paid_until), [row.paid_until])

  // Bike public profiles always live at /r/<slug>. Riders don't have
  // /car / /bus / /truck variants.
  const profileHref = row.slug ? `/r/${row.slug}` : null
  const photoCount = (row.vehicle_photos ?? []).filter((u) => typeof u === 'string' && u.trim()).length
  const hasRate    = (row.price_per_km ?? 0) > 0 || (row.min_fee ?? 0) > 0

  // Completeness — a soft 0-100 score guiding the rider toward setup
  // gaps. Surfaces are: business name, bike, photos (>=1), rate, cover image.
  const completeness = useMemo(() => {
    let score = 0
    if (row.business_name?.trim())    score += 20
    if (row.bike_make && row.bike_model) score += 20
    if (photoCount >= 1)              score += 20
    if (hasRate)                      score += 20
    if (row.cover_image_url)          score += 20
    return score
  }, [row, photoCount, hasRate])

  return (
    <Shell>
      <PWAInstallCard />

      {/* Compact identity row — replaces the big yellow hero */}
      <IdentityRow row={row} profileHref={profileHref} />

      {/* AVAILABILITY SWITCHER — the centerpiece */}
      <AvailabilitySwitcher
        value={row.availability ?? 'offline'}
        onChange={() => onReload()}
      />

      {/* 2-column micro grid — Account Health + Market Position */}
      <section className="grid grid-cols-2 gap-2 mb-4">
        <AccountHealthCard
          completeness={completeness}
          userId={row.user_id}
          socialHref="/dashboard/rider/social"
        />
        <MarketPositionCard
          pricePerKm={row.price_per_km}
          city={row.city}
          vehicleType="bike"
        />
      </section>

      {/* Subscription banner — only when attention is required */}
      {sub.kind !== 'active' && (
        <SubscriptionBanner sub={sub} />
      )}
      {sub.kind === 'active' && sub.daysLeft <= 7 && (
        <SubscriptionBanner sub={sub} />
      )}

      {/* KPI strip — quick stats the rider wants to see at a glance. Pushed
          below the fold; the first-screen value lives in the cards above. */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <Kpi
          label="Rating"
          value={row.rating != null && row.rating > 0 ? row.rating.toFixed(1) : '—'}
          sub={row.rating_count ? `${row.rating_count} reviews` : 'No reviews yet'}
        />
        <Kpi
          label="Photos"
          value={String(photoCount)}
          sub={photoCount >= 3 ? 'Great' : photoCount > 0 ? 'Add more' : 'Add some'}
        />
        <Kpi
          label="Engine"
          value={row.bike_cc ? `${row.bike_cc}cc` : '—'}
          sub="cc"
        />
        <Kpi
          label="Rate"
          value={(row.price_per_km ?? 0) > 0 ? `Rp ${row.price_per_km!.toLocaleString('id-ID')}` : '—'}
          sub="per km"
        />
      </section>

      {/* Public profile preview link */}
      {profileHref && (
        <section className="mb-4">
          <Link
            href={profileHref}
            className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white border-2 border-dashed border-[#FACC15] hover:bg-[#FFFBEA] transition active:scale-[0.99]"
          >
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#EAB308]">Your public page</div>
              <div className="text-[14px] font-black text-black truncate mt-0.5">cityriders.id{profileHref}</div>
              <div className="text-[12px] text-black/60 mt-0.5">Preview what customers see.</div>
            </div>
            <ExternalLink className="w-5 h-5 shrink-0 text-[#0A0A0A]" strokeWidth={2.5} />
          </Link>
        </section>
      )}

      {/* The Six Pages */}
      <section className="mb-4">
        <SectionLabel>Your six pages</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <SixCard href="/dashboard/rider/info"     icon={<User      className="w-4 h-4" strokeWidth={2.5} />} title="Profile" />
          <SixCard href="/dashboard/rider/vehicle"  icon={<Bike      className="w-4 h-4" strokeWidth={2.5} />} title="Bike details" />
          <SixCard href="/dashboard/rider/services" icon={<Layers    className="w-4 h-4" strokeWidth={2.5} />} title="Services & rates" />
          <SixCard href="/dashboard/rider/social"   icon={<Sparkles  className="w-4 h-4" strokeWidth={2.5} />} title="Social posts" />
          <SixCard href="/dashboard/rider/stats"    icon={<BarChart3 className="w-4 h-4" strokeWidth={2.5} />} title="Stats" />
          <SixCard href="/dashboard/rider/hotspots" icon={<Flame     className="w-4 h-4" strokeWidth={2.5} />} title="City busy areas" />
        </div>
      </section>

      <section className="mb-4">
        <SectionLabel>More tools</SectionLabel>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <ActionCard compact href="/dashboard/rider/tours"        icon={<MapIcon    className="w-5 h-5" strokeWidth={2.5} />} title="Tour packages" />
          <ActionCard compact href="/dashboard/rider/edit"         icon={<Pencil     className="w-5 h-5" strokeWidth={2.5} />} title="Page design" />
          <ActionCard compact href="/dashboard/rider/payments"     icon={<CreditCard className="w-5 h-5" strokeWidth={2.5} />} title="Payments" />
          <ActionCard compact href="/dashboard/rider/subscription" icon={<Wallet     className="w-5 h-5" strokeWidth={2.5} />} title="Subscription" />
        </div>
      </section>

      <section className="mb-6">
        <SectionLabel>Trust &amp; legal</SectionLabel>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <ActionCard compact href="/dashboard/rider/faq"     icon={<HelpCircle  className="w-5 h-5" strokeWidth={2.5} />} title="FAQ" />
          <ActionCard compact href="/dashboard/rider/terms"   icon={<FileText    className="w-5 h-5" strokeWidth={2.5} />} title="Terms" />
          <ActionCard compact href="/dashboard/rider/privacy" icon={<ShieldCheck className="w-5 h-5" strokeWidth={2.5} />} title="Privacy" />
        </div>
      </section>
    </Shell>
  )
}

// ─── First-screen pieces ─────────────────────────────────────────────

function IdentityRow({
  row, profileHref,
}: {
  row: RiderOverview
  profileHref: string | null
}) {
  const vehicleLabel = useMemo(() => {
    const parts = [row.bike_make, row.bike_model].filter(Boolean)
    return parts.length ? parts.join(' ') : 'Bike'
  }, [row.bike_make, row.bike_model])
  const place = [row.area, row.city].filter(Boolean).join(', ') || 'Set city'

  return (
    <section className="mb-3 px-1">
      <div className="text-[13px] font-extrabold text-[#0A0A0A] leading-tight truncate">
        {row.business_name || 'Set your business name'}
        <span className="text-black/55 font-bold"> · {vehicleLabel} · {place}</span>
      </div>
      {profileHref && (
        <Link
          href={profileHref}
          className="inline-flex items-center gap-1 text-[11px] text-black/55 mt-0.5 hover:text-[#0A0A0A] transition"
        >
          cityriders.id{profileHref}
          <span className="text-[#EAB308] font-extrabold">· View →</span>
        </Link>
      )}
    </section>
  )
}

// ─── Account Health card ─────────────────────────────────────────────

function AccountHealthCard({
  completeness, userId, socialHref,
}: {
  completeness: number
  userId:       string
  socialHref:   string
}) {
  const [shares, setShares] = useState<number | null>(null)
  const [windowLabel, setWindowLabel] = useState<string>('this week')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = getBrowserSupabase()
      if (!supabase) return
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
      // Primary: count share_click rows in the last 7 days.
      const primary = await supabase
        .from('provider_profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('provider_type', 'driver')
        .eq('provider_id',   userId)
        .eq('source',        'wa_share')
        .gte('viewed_at',    since)
      if (!cancelled && !primary.error && primary.count != null) {
        setShares(primary.count)
        setWindowLabel('this week')
        return
      }
      // Fallback: all-time wa_share count.
      const fallback = await supabase
        .from('provider_profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('provider_type', 'driver')
        .eq('provider_id',   userId)
        .eq('source',        'wa_share')
      if (!cancelled && !fallback.error && fallback.count != null) {
        setShares(fallback.count)
        setWindowLabel('all-time')
      }
    })()
    return () => { cancelled = true }
  }, [userId])

  return (
    <div className="rounded-2xl bg-white border border-black/10 p-3 flex flex-col gap-1.5">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-black/55">
        ACCOUNT HEALTH
      </div>
      <div className="text-[22px] font-black text-[#0A0A0A] leading-none tabular-nums">
        {completeness}%
      </div>
      <div className="h-1.5 rounded-full bg-[#F4F4F5] overflow-hidden">
        <div
          className="h-full transition-[width]"
          style={{ width: `${completeness}%`, background: '#FACC15' }}
        />
      </div>
      <div className="text-[11px] font-bold text-black/65 leading-snug">
        Profile shares: <span className="text-[#0A0A0A] font-black tabular-nums">{shares ?? '—'}</span>{' '}
        {windowLabel}
      </div>
      <Link
        href={socialHref}
        className="inline-flex items-center gap-1 text-[11px] font-extrabold leading-snug text-[#854D0E] hover:text-[#0A0A0A] transition mt-0.5"
      >
        <Share2 className="w-3 h-3" strokeWidth={2.5} />
        Tip — Share your profile daily.
      </Link>
    </div>
  )
}

// ─── Market Position card ────────────────────────────────────────────

function MarketPositionCard({
  pricePerKm, city, vehicleType,
}: {
  pricePerKm:  number | null
  city:        string | null
  vehicleType: 'bike' | 'car'
}) {
  const [avg, setAvg] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = getBrowserSupabase()
      if (!supabase || !city) { setLoading(false); return }
      const { data, error } = await supabase
        .from('drivers')
        .select('price_per_km')
        .eq('vehicle_type', vehicleType)
        .eq('status',       'active')
        .eq('city',         city)
        .gt('price_per_km', 0)
      if (cancelled) return
      setLoading(false)
      if (error || !data || data.length === 0) { setAvg(null); return }
      const sum = data.reduce((a, r) => a + (Number(r.price_per_km) || 0), 0)
      setAvg(Math.round(sum / data.length))
    })()
    return () => { cancelled = true }
  }, [city, vehicleType])

  // No rate set → nudge user to set it.
  if (!pricePerKm || pricePerKm <= 0) {
    return (
      <div className="rounded-2xl bg-white border border-black/10 p-3 flex flex-col gap-1.5">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-black/55">
          MARKET POSITION
        </div>
        <div className="text-[13px] font-black text-[#0A0A0A] leading-tight">No rate yet</div>
        <p className="text-[11px] text-black/65 leading-snug">
          Set your km rate in Services to compare.
        </p>
        <Link
          href={`/dashboard/${vehicleType === 'bike' ? 'rider' : 'car'}/services`}
          className="text-[11px] font-extrabold text-[#854D0E] hover:text-[#0A0A0A] transition mt-auto"
        >
          Set rate →
        </Link>
      </div>
    )
  }

  const yourRate = pricePerKm
  const cityLabel = city || 'your city'

  let verdict: { tone: 'good' | 'avg' | 'high'; line: string; coaching: string | null } | null = null
  if (avg != null && avg > 0) {
    const diffPct = ((yourRate - avg) / avg) * 100
    if (diffPct <= -10) {
      verdict = {
        tone: 'good',
        line: `✓ ${Math.round(Math.abs(diffPct))}% below — good for new drivers`,
        coaching: 'Keep rates competitive while building your customer base.',
      }
    } else if (diffPct >= 10) {
      verdict = {
        tone: 'high',
        line: `↑ ${Math.round(diffPct)}% above — may slow first bookings`,
        coaching: 'Keep rates competitive while building your customer base.',
      }
    } else {
      verdict = { tone: 'avg', line: '≈ around market average', coaching: null }
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-black/10 p-3 flex flex-col gap-1">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-black/55">
        MARKET POSITION
      </div>
      <div className="text-[13px] font-black text-[#0A0A0A] leading-tight tabular-nums">
        Your rate Rp {yourRate.toLocaleString('id-ID')}
      </div>
      <div className="text-[11px] font-bold text-black/65 leading-snug truncate">
        Avg in {cityLabel}: {loading ? '…' : avg != null ? `Rp ${avg.toLocaleString('id-ID')}` : '—'}
      </div>
      {verdict && (
        <span
          className="inline-block text-[11px] font-extrabold leading-snug px-1.5 py-0.5 rounded-md mt-0.5 w-fit max-w-full truncate"
          style={{
            background:
              verdict.tone === 'good' ? '#DCFCE7' :
              verdict.tone === 'high' ? '#FEF3C7' : '#F4F4F5',
            color:
              verdict.tone === 'good' ? '#15803D' :
              verdict.tone === 'high' ? '#92400E' : '#52525B',
          }}
        >
          {verdict.line}
        </span>
      )}
      {verdict?.coaching && (
        <p className="text-[10.5px] text-black/55 leading-snug mt-0.5">
          {verdict.coaching}
        </p>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

function SubscriptionBanner({ sub }: { sub: SubStatus }) {
  const isUrgent = sub.kind !== 'active'
  const heading =
    sub.kind === 'never'   ? 'Activate your subscription' :
    sub.kind === 'expired' ? 'Subscription expired' :
                             `${sub.daysLeft} days until renewal`
  const body =
    sub.kind === 'never'   ? 'Your profile stays hidden from customers until you pay Rp 38.000 for the first month.' :
    sub.kind === 'expired' ? `Your access ended ${formatDateID(sub.until)}. Renew to come back online.` :
                             `Active until ${formatDateID(sub.until)}. WhatsApp admin to renew early.`
  return (
    <section
      className="rounded-2xl p-4 sm:p-5 mb-4 flex items-start gap-3"
      style={{
        background: isUrgent ? '#FEF3C7' : '#FFFBEA',
        border: `1px solid ${isUrgent ? '#FACC15' : 'rgba(250,204,21,0.45)'}`,
      }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: isUrgent ? '#FACC15' : 'rgba(250,204,21,0.30)', color: '#0A0A0A' }}
      >
        {isUrgent ? <AlertTriangle className="w-5 h-5" strokeWidth={2.5} />
                  : <Clock className="w-5 h-5" strokeWidth={2.5} />}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-black text-[#0A0A0A] leading-tight">{heading}</h2>
        <p className="text-[12.5px] text-[#0A0A0A]/70 leading-snug mt-0.5">{body}</p>
      </div>
      <a
        href={ADMIN_WA_RENEW}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#FACC15] text-[#0A0A0A] text-[12px] font-extrabold uppercase tracking-wider transition active:scale-[0.97]"
        style={{ minHeight: 36 }}
      >
        <MessageCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
        Renew
      </a>
    </section>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-black/10 p-3 sm:p-4">
      <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-black/55">{label}</div>
      <div className="text-[20px] sm:text-[22px] font-black text-[#0A0A0A] leading-tight mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] font-bold text-black/55 mt-0.5">{sub}</div>}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-black/55 mb-2 px-1">
      {children}
    </div>
  )
}

function SixCard({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white border border-[#E4E4E7] p-3 flex items-center gap-2.5 hover:border-[#FACC15] hover:shadow-[0_8px_24px_rgba(250,204,21,0.18)] active:scale-[0.99] transition"
      style={{ minHeight: 64 }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: '#FACC15',
          color: '#0A0A0A',
          boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
        }}
      >
        {icon}
      </div>
      <div className="text-[13px] font-black text-[#0A0A0A] leading-tight min-w-0 flex-1">
        {title}
      </div>
    </Link>
  )
}

function ActionCard({
  href, icon, title, hint, highlight, compact,
}: {
  href: string
  icon: React.ReactNode
  title: string
  hint?: string
  highlight?: boolean
  compact?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group relative rounded-2xl bg-white border ${highlight ? 'border-[#FACC15]' : 'border-black/10'} ${compact ? 'p-3' : 'p-4'} flex flex-col gap-2 hover:border-[#FACC15] hover:shadow-[0_8px_24px_rgba(250,204,21,0.18)] active:scale-[0.99] transition`}
      style={highlight ? { background: '#FFFBEA' } : undefined}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: '#FACC15',
            color: '#0A0A0A',
            boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
          }}
        >
          {icon}
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-black/35 group-hover:text-[#0A0A0A] transition" strokeWidth={2.5} />
      </div>
      <div className={`text-[${compact ? '13' : '14'}px] font-black text-[#0A0A0A] leading-tight`}>{title}</div>
      {!compact && hint && (
        <div className="text-[11.5px] font-bold text-black/55 leading-snug">{hint}</div>
      )}
    </Link>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-24">
        {children}
      </div>
    </main>
  )
}

function FullPageMessage({
  children, cta, spinner,
}: {
  children: React.ReactNode
  cta?: { href: string; label: string }
  spinner?: boolean
}) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      <div className="max-w-md mx-auto px-4 pt-24 text-center">
        {spinner && (
          <Loader2 className="w-7 h-7 mx-auto text-[#EAB308] animate-spin mb-3" strokeWidth={2.5} />
        )}
        <div className="text-[14px] font-bold text-black/70 leading-relaxed">{children}</div>
        {cta && (
          <Link
            href={cta.href}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[13px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            {cta.label}
            <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        )}
      </div>
    </main>
  )
}
