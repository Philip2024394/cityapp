'use client'
// ============================================================================
// /dashboard/rider — Rider (motorbike) dashboard home
// ----------------------------------------------------------------------------
// Mirror of /dashboard/car for bike drivers. Shows overview + jump-off
// links to focused subpages. High signal, low noise.
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
  QrCode, Sparkles, HelpCircle, FileText, ShieldCheck, ArrowRight,
  CheckCircle2, AlertTriangle, Clock, MessageCircle, ExternalLink,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import PWAInstallCard from '@/components/dashboard/PWAInstallCard'

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
    // Only riders (bikes) belong on /dashboard/rider — car/truck/bus
    // drivers route to /dashboard/car.
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
  const vehicleLabel = useMemo(() => {
    const parts = [row.bike_make, row.bike_model, row.bike_year ? String(row.bike_year) : null].filter(Boolean)
    return parts.length ? parts.join(' ') : 'Bike not set'
  }, [row.bike_make, row.bike_model, row.bike_year])

  // Bike public profiles always live at /r/<slug>. Riders don't have
  // /car / /bus / /truck variants.
  const profileHref = row.slug ? `/r/${row.slug}` : null

  const photoCount = (row.vehicle_photos ?? []).filter((u) => typeof u === 'string' && u.trim()).length
  const hasRate    = (row.price_per_km ?? 0) > 0 || (row.min_fee ?? 0) > 0

  // Completeness — a soft 0-100 score guiding the rider toward setup
  // gaps. Pure presentation; no DB write yet. Surfaces are: business
  // name, bike, photos (>=1), rate, cover image.
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
      {/* Hero strip — name + availability + completeness */}
      <section
        className="rounded-3xl p-5 sm:p-6 mb-4"
        style={{
          background: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
          color: '#0A0A0A',
          boxShadow: '0 12px 32px rgba(250,204,21,0.30)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] opacity-70">
              Rider
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-black leading-tight truncate mt-0.5">
              {row.business_name || 'Set your business name'}
            </h1>
            <div className="text-[12.5px] font-bold opacity-80 mt-1 truncate">
              {vehicleLabel}
              {row.bike_cc ? ` · ${row.bike_cc}cc` : ''}
              {row.area || row.city ? ` · ${[row.area, row.city].filter(Boolean).join(', ')}` : ''}
            </div>
          </div>
          <AvailabilityBadge value={row.availability ?? 'offline'} onChange={onReload} />
        </div>

        {/* Completeness bar — encourages full profile without nagging */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider opacity-80">
            <span>Profile completeness</span>
            <span>{completeness}%</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(10,10,10,0.18)' }}>
            <div className="h-full rounded-full transition-[width]" style={{ width: `${completeness}%`, background: '#0A0A0A' }} />
          </div>
        </div>
      </section>

      {/* Subscription banner — only when attention is required */}
      {sub.kind !== 'active' && (
        <SubscriptionBanner sub={sub} />
      )}
      {sub.kind === 'active' && sub.daysLeft <= 7 && (
        <SubscriptionBanner sub={sub} />
      )}

      {/* KPI strip — quick stats the rider wants to see at a glance.
          Phase 1B will replace the static placeholders here with real
          numbers from a new /api/dashboard/rider/overview endpoint. */}
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

      {/* Quick action grid — each tile routes to a focused subpage */}
      <section className="mb-4">
        <SectionLabel>Manage your profile</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <ActionCard href="/dashboard/rider/info"     icon={<User      className="w-5 h-5" strokeWidth={2.5} />} title="Profile info"      hint="Name, bio, area" />
          <ActionCard href="/dashboard/rider/edit"     icon={<Pencil    className="w-5 h-5" strokeWidth={2.5} />} title="Page design"       hint="Banner, hero" />
          <ActionCard href="/dashboard/rider/vehicle"  icon={<Bike      className="w-5 h-5" strokeWidth={2.5} />} title="Bike details"      hint={vehicleLabel === 'Bike not set' ? 'Set up' : 'Photos, specs'} />
          <ActionCard href="/dashboard/rider/services" icon={<Layers    className="w-5 h-5" strokeWidth={2.5} />} title="Services & rates"  hint="Per-km, airport, rental" />
          <ActionCard href="/dashboard/rider/payments" icon={<CreditCard className="w-5 h-5" strokeWidth={2.5} />} title="Payment methods"   hint="Cash, QR, transfer" />
          <ActionCard href="/dashboard/rider/subscription" icon={<Wallet className="w-5 h-5" strokeWidth={2.5} />} title="Subscription"      hint={sub.kind === 'active' ? `${sub.daysLeft}d left` : sub.kind === 'expired' ? 'Past due' : 'Pay to activate'} />
        </div>
      </section>

      <section className="mb-4">
        <SectionLabel>Grow your bookings</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <ActionCard href="/dashboard/rider/stats"  icon={<Flame    className="w-5 h-5" strokeWidth={2.5} />} title="Stats"        hint="Views, clicks" />
          <ActionCard href="/dashboard/rider/qr"     icon={<QrCode   className="w-5 h-5" strokeWidth={2.5} />} title="Profile QR"   hint="Print, share" />
          <ActionCard href="/dashboard/rider/social" icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />} title="Social posts" hint="20/month, free" highlight />
        </div>
      </section>

      <section className="mb-4">
        <SectionLabel>Trust &amp; legal</SectionLabel>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <ActionCard compact href="/dashboard/rider/faq"     icon={<HelpCircle  className="w-5 h-5" strokeWidth={2.5} />} title="FAQ" />
          <ActionCard compact href="/dashboard/rider/terms"   icon={<FileText    className="w-5 h-5" strokeWidth={2.5} />} title="Terms" />
          <ActionCard compact href="/dashboard/rider/privacy" icon={<ShieldCheck className="w-5 h-5" strokeWidth={2.5} />} title="Privacy" />
        </div>
      </section>

      {/* Public profile link */}
      {profileHref && (
        <section className="mb-6">
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

      {/* Legacy fallback — temporary until Phase 1B finishes moving
          existing sections into the subpages. Deletion tracked at the
          top of /dashboard/rider/legacy/page.tsx. */}
      <section className="mb-4">
        <Link
          href="/dashboard/rider/legacy"
          className="block text-center text-[11px] font-bold text-black/45 underline-offset-2 hover:underline"
        >
          Old dashboard view (temporary)
        </Link>
      </section>
    </Shell>
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

function AvailabilityBadge({ value, onChange }: { value: 'online' | 'busy' | 'offline'; onChange: () => void }) {
  // Phase 1A: read-only badge. Phase 1B will wire the actual three-way
  // selector into /dashboard/rider/info (Availability section) — for now,
  // tapping the badge bounces the user there.
  const map = {
    online:  { dot: '#10B981', label: 'Online' },
    busy:    { dot: '#F59E0B', label: 'Busy' },
    offline: { dot: '#71717A', label: 'Offline' },
  } as const
  const s = map[value]
  return (
    <Link
      href="/dashboard/rider/info"
      onClick={onChange}
      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white text-[#0A0A0A] text-[11px] font-extrabold uppercase tracking-wider transition active:scale-[0.97]"
      style={{ boxShadow: '0 2px 8px rgba(10,10,10,0.10)' }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} aria-hidden />
      {s.label}
    </Link>
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
            background: highlight ? '#FACC15' : '#FFFBEA',
            color:      highlight ? '#0A0A0A' : '#EAB308',
            border:     highlight ? 'none' : '1px solid rgba(250,204,21,0.45)',
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
