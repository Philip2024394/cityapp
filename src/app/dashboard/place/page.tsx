'use client'
// ============================================================================
// /dashboard/place — Place owner dashboard
// ----------------------------------------------------------------------------
// IndoCity is a SOFTWARE DIRECTORY. Places (restaurants, cafés, attractions,
// hotels, etc.) self-publish their own listing details. IndoCity NEVER
// custodies funds, sets prices, or processes payments — we only host the
// listing card and the QRIS proof-of-payment for the 38,000 IDR/month
// subscription that keeps the listing live on /places.
//
// Subscription: 38,000 IDR/month, owner uploads QRIS screenshot via the
// modal at the bottom of this file. The /api/dashboard/subscription-payment
// endpoint records the proof and optimistically bumps places.paid_until.
// Admin verifies (or reverts) later via /admin/subscriptions.
//
// Multi-place owners: header dropdown lets them switch between their places.
// Single-place owners skip straight to the dashboard for that one row.
//
// Photos: Phase 1 collects pasted URLs only — same as /dashboard/car.
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, X, Upload, CheckCircle2, ChevronDown, Plus, Trash2, Pencil } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { CATEGORIES, GROUPS } from '@/lib/places/categories'
import type { PlaceCategory } from '@/lib/places/types'

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const SUBSCRIPTION_IDR     = 38_000
const ADMIN_WHATSAPP_E164  = '6285183600015' // streetlocallive admin line
const ADMIN_WA_RENEW = `https://wa.me/${ADMIN_WHATSAPP_E164}?text=${encodeURIComponent(
  'Halo admin, saya mau bayar/renew langganan listing place IndoCity (Rp 38.000/bulan).',
)}`
// Founder will swap this to the real merchant QRIS image when ready. Swap
// this single constant — no other code changes needed.
const QRIS_IMAGE_URL = 'https://ik.imagekit.io/nepgaxllc/qris-placeholder.png'

// Row shape used by this page. The places table is untyped at the Supabase
// client level (see lib/supabase/client.ts) so we validate the shape here.
type PlaceRow = {
  id: string
  slug: string | null
  name: string
  category: PlaceCategory
  description: string | null
  image_urls: string[] | null
  city: string
  address: string | null
  lat: number | null
  lng: number | null
  whatsapp_e164: string | null
  hours_json: unknown
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  paid_until: string | null
  verified: boolean | null
  owner_user_id: string | null
  tags: string[] | null
  cuisine_types: string[] | null
  rating: number | null
  review_count: number | null
  created_at: string | null
  contact_enabled: boolean | null
}

// Row shape for place_offers — owner-managed menu/ticket/highlight items.
// price_idr is nullable so image-only entries (e.g. temple highlights,
// gallery pieces) skip price entirely. RLS handles authorisation; we
// scope every write to owner_user_id at the call site for defence in depth.
type PlaceOfferRow = {
  id:          string
  place_id:    string
  name:        string
  description: string | null
  price_idr:   number | null
  image_url:   string | null
  sort_order:  number
  created_at:  string | null
  updated_at:  string | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_place' }
  | { kind: 'ready'; rows: PlaceRow[] }
  | { kind: 'error'; message: string }

// ----------------------------------------------------------------------------
// Subscription helpers
// ----------------------------------------------------------------------------
type SubStatus =
  | { kind: 'pending_approval' }       // status='pending' AND paid_until is null
  | { kind: 'never_paid' }              // status='approved' AND paid_until is null
  | { kind: 'expired'; until: string }  // paid_until < today
  | { kind: 'active';  until: string }  // paid_until >= today

function classifySubscription(row: PlaceRow): SubStatus {
  if (!row.paid_until) {
    if (row.status === 'pending') return { kind: 'pending_approval' }
    return { kind: 'never_paid' }
  }
  // Compare as ISO date strings (YYYY-MM-DD lexicographic == chronological).
  const today = new Date().toISOString().slice(0, 10)
  if (row.paid_until < today) return { kind: 'expired', until: row.paid_until }
  return { kind: 'active', until: row.paid_until }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

// ============================================================================
// Page
// ============================================================================
export default function PlaceOwnerDashboardPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('places')
      .select(
        'id, slug, name, category, description, image_urls, city, address, lat, lng, ' +
        'whatsapp_e164, hours_json, status, paid_until, verified, owner_user_id, ' +
        'tags, cuisine_types, rating, review_count, created_at, contact_enabled',
      )
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) { setState({ kind: 'error', message: error.message }); return }
    const rows = (data ?? []) as unknown as PlaceRow[]
    if (rows.length === 0) { setState({ kind: 'no_place' }); return }
    setState({ kind: 'ready', rows })
    // Default to first place if nothing selected yet, or if the selected id
    // is no longer in the list (e.g. admin removed a listing).
    setSelectedId((prev) => {
      if (prev && rows.some((r) => r.id === prev)) return prev
      return rows[0].id
    })
  }, [])

  useEffect(() => { reload() }, [reload])

  if (state.kind === 'loading') {
    return <Shell><div className="px-4 pt-6 text-black/50 text-[13px]">Loading…</div></Shell>
  }
  if (state.kind === 'no_supabase') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Auth not configured</h1>
          <p className="text-[13px] text-black/70">Supabase is not configured in this environment.</p>
        </div>
      </Shell>
    )
  }
  if (state.kind === 'unauth') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link
            href="/login?next=/dashboard/place"
            className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block min-h-[44px]"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    )
  }
  if (state.kind === 'no_place') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">No place listed yet</h1>
          <p className="text-[13px] text-black/70 mb-6">
            You don&apos;t have a place listed yet. List your first place at{' '}
            <span className="font-mono">/list-place/new</span>.
          </p>
          <Link
            href="/list-place/new"
            className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block min-h-[44px]"
          >
            List a place
          </Link>
        </div>
      </Shell>
    )
  }
  if (state.kind === 'error') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Could not load places</h1>
          <p className="text-[13px] text-black/70 mb-4">{state.message}</p>
          <button
            onClick={reload}
            className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block min-h-[44px]"
          >
            Retry
          </button>
        </div>
      </Shell>
    )
  }

  const row = state.rows.find((r) => r.id === selectedId) ?? state.rows[0]
  return (
    <Dashboard
      rows={state.rows}
      row={row}
      onSelect={setSelectedId}
      onReload={reload}
    />
  )
}

// ============================================================================
// Dashboard — only mounts when we have at least one places row
// ----------------------------------------------------------------------------
// QRIS modal + paid_until override mirror /dashboard/car. On a successful
// upload we optimistically flip paid_until — the banner turns green
// immediately, before the (slower) full row reload completes.
// ============================================================================
function Dashboard({
  rows,
  row,
  onSelect,
  onReload,
}: {
  rows: PlaceRow[]
  row: PlaceRow
  onSelect: (id: string) => void
  onReload: () => void
}) {
  // Optimistic override — replaces row.paid_until until the next reload.
  // Keyed by place id so switching places doesn't leak the override.
  const [paidUntilOverride, setPaidUntilOverride] = useState<Record<string, string>>({})
  const [payOpen, setPayOpen]   = useState(false)
  const [paidToast, setPaidToast] = useState<string | null>(null)
  const effectiveRow: PlaceRow = {
    ...row,
    paid_until: paidUntilOverride[row.id] ?? row.paid_until,
  }
  const sub = classifySubscription(effectiveRow)

  function handlePaymentSubmitted(activeUntil: string) {
    setPaidUntilOverride((prev) => ({ ...prev, [row.id]: activeUntil }))
    setPayOpen(false)
    setPaidToast('Payment submitted! Your listing is active.')
    setTimeout(() => setPaidToast(null), 4200)
    // Refresh so the row is hydrated from the DB (drops the override).
    onReload()
  }

  return (
    <Shell>
      <div className="px-4 pt-6 pb-24 max-w-3xl mx-auto space-y-4">
        {paidToast && (
          <div
            className="rounded-xl border border-green-300 bg-green-50 text-green-800 text-[13px] px-4 py-3 flex items-center gap-2 shadow-sm"
            role="status"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
            <span className="font-bold">{paidToast}</span>
          </div>
        )}

        {rows.length > 1 && (
          <PlaceSwitcher rows={rows} selectedId={row.id} onSelect={onSelect} />
        )}

        <SubscriptionBanner sub={sub} onPay={() => setPayOpen(true)} />

        <header className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h1 className="text-[20px] font-black mb-1 truncate">{row.name || 'Place'}</h1>
          <div className="text-[13px] text-black/60">
            Place owner dashboard · IndoCity is a software directory — your listing rates and details are self-published.
          </div>
        </header>

        <ListingStatusCard row={effectiveRow} />
        <BasicsSection      row={row} onSaved={onReload} />
        <VisitInfoSection   row={row} onSaved={onReload} />
        <PhotosSection      row={row} onSaved={onReload} />
        <OffersSection      row={row} />
        <ContactToggleSection row={row} onSaved={onReload} />
        <HoursSection       row={row} onSaved={onReload} />
      </div>

      <QrisPaymentModal
        open={payOpen}
        placeId={row.id}
        placeName={row.name}
        onClose={() => setPayOpen(false)}
        onSubmitted={handlePaymentSubmitted}
      />
    </Shell>
  )
}

// ============================================================================
// Place switcher — only rendered for multi-place owners
// ============================================================================
function PlaceSwitcher({
  rows,
  selectedId,
  onSelect,
}: {
  rows: PlaceRow[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-black/70 mb-1 inline-block">Managing place</span>
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full appearance-none rounded-xl bg-white border border-gray-300 px-4 py-3 pr-10 text-[14px] font-bold text-black focus:outline-none focus:border-brand min-h-[44px]"
        >
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.city}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/50"
          aria-hidden
        />
      </div>
    </label>
  )
}

// ============================================================================
// Subscription banner
// ----------------------------------------------------------------------------
// - "pending_approval" — Yellow: awaiting admin approval; cannot pay yet.
// - "never_paid"       — Yellow: approved, prompt to pay.
// - "expired"          — Yellow: renew CTA with expiry date.
// - "active"           — Small green pill at top of page.
// ============================================================================
function SubscriptionBanner({ sub, onPay }: { sub: SubStatus; onPay: () => void }) {
  if (sub.kind === 'active') {
    return (
      <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-2">
        <span className="inline-flex items-center gap-2 text-[13px] font-extrabold text-green-800">
          <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
          Active until {formatDate(sub.until)}
        </span>
        <span className="text-[12px] text-green-700/80">Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')} / month</span>
      </div>
    )
  }

  const isPending = sub.kind === 'pending_approval'
  const isExpired = sub.kind === 'expired'

  const heading = isPending
    ? 'Your place is awaiting admin approval'
    : isExpired
      ? `Subscription expired on ${formatDate(sub.until)}`
      : 'Approved! Pay to activate your listing'

  const body = isPending
    ? `After approval, pay Rp ${SUBSCRIPTION_IDR.toLocaleString('id-ID')} to activate your listing.`
    : isExpired
      ? `Renew (Rp ${SUBSCRIPTION_IDR.toLocaleString('id-ID')}/month) to keep your listing live on /places.`
      : `Pay Rp ${SUBSCRIPTION_IDR.toLocaleString('id-ID')} / month to activate your listing on /places.`

  return (
    <div className="rounded-2xl bg-yellow-50 border border-yellow-300 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-yellow-900"
          style={{ background: 'linear-gradient(135deg, #FACC15, #EAB308)' }}
        >
          !
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-black text-yellow-900 leading-snug">{heading}</h2>
          <p className="text-[13px] text-yellow-900/85 leading-relaxed mt-1">{body}</p>
          {!isPending && (
            <p className="text-[13px] text-yellow-900/85 leading-relaxed mt-1">
              Pay Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')}/month via QRIS — your listing activates immediately.
            </p>
          )}
          {!isPending && (
            <button
              type="button"
              onClick={onPay}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 text-yellow-950 px-5 py-3 text-[13px] font-extrabold min-h-[44px] active:scale-[0.99]"
            >
              Pay via QRIS →
            </button>
          )}
          <div className="mt-2">
            <a
              href={ADMIN_WA_RENEW}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold text-yellow-900/70 hover:text-yellow-900 hover:underline"
            >
              Need help? WhatsApp admin
            </a>
          </div>
          <p className="text-[12px] text-yellow-900/65 leading-snug mt-3">
            IndoCity is a software directory. We do not custody or process funds.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Listing status card — read-only indicators
// ============================================================================
function ListingStatusCard({ row }: { row: PlaceRow }) {
  const sub = classifySubscription(row)
  return (
    <SectionCard title="Listing status">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatusTile label="Approval" value={statusLabel(row.status)} tone={statusTone(row.status)} />
        <StatusTile
          label="Verified"
          value={row.verified ? 'Verified' : 'Not yet'}
          tone={row.verified ? 'green' : 'gray'}
        />
        <StatusTile
          label="Subscription"
          value={
            sub.kind === 'active'
              ? `Until ${formatDate(sub.until)}`
              : sub.kind === 'expired'
                ? `Expired ${formatDate(sub.until)}`
                : sub.kind === 'pending_approval'
                  ? 'Awaiting approval'
                  : 'Not paid'
          }
          tone={sub.kind === 'active' ? 'green' : 'yellow'}
        />
        <StatusTile
          label="Public URL"
          value={row.slug ? `/places/${row.slug}` : '—'}
          tone="gray"
        />
      </div>
      <p className="text-[12px] text-black/55 leading-snug">
        Verified status is admin-only. To request verification, message the admin on WhatsApp.
      </p>
    </SectionCard>
  )
}

function statusLabel(s: PlaceRow['status']): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function statusTone(s: PlaceRow['status']): TileTone {
  if (s === 'approved') return 'green'
  if (s === 'pending')  return 'yellow'
  return 'red'
}
type TileTone = 'green' | 'yellow' | 'red' | 'gray'
function StatusTile({ label, value, tone }: { label: string; value: string; tone: TileTone }) {
  const tones: Record<TileTone, string> = {
    green:  'bg-green-50 border-green-200 text-green-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    red:    'bg-red-50 border-red-200 text-red-900',
    gray:   'bg-gray-50 border-gray-200 text-gray-900',
  }
  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone]}`}>
      <div className="text-[11px] font-extrabold uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-[13px] font-extrabold truncate">{value}</div>
    </div>
  )
}

// ============================================================================
// Section shells — Card + collapsible Edit/Save split per section so edits
// in one card don't conflict with others.
// ============================================================================
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      <h2 className="text-[14px] font-extrabold uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  )
}

function SaveButton({ saving, dirty }: { saving: boolean; dirty: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving || !dirty}
      className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-60"
    >
      {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
    </button>
  )
}

function Toast({ kind, children }: { kind: 'ok' | 'err'; children: React.ReactNode }) {
  const cls = kind === 'ok'
    ? 'border-green-300 bg-green-50 text-green-800'
    : 'border-red-300 bg-red-50 text-red-800'
  return (
    <div className={`rounded-lg border ${cls} text-[13px] px-3 py-2`}>{children}</div>
  )
}

const inputCls =
  'w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-[14px] text-black placeholder:text-black/40 focus:outline-none focus:border-brand min-h-[44px]'

const labelCls = 'block'
const labelTextCls = 'text-[13px] font-bold text-black/70 mb-1 inline-block'

// ============================================================================
// Hook: useSectionSaver — shared per-section save state. Updates the
// `places` row scoped to the given place id.
// ============================================================================
function useSectionSaver(placeId: string, onSaved: () => void) {
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const save = useCallback(async (patch: Record<string, unknown>) => {
    setToast(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setToast({ kind: 'err', msg: 'Supabase not configured.' }); return false }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setToast({ kind: 'err', msg: 'Not signed in.' }); return false }
    setSaving(true)
    // RLS scopes UPDATE to rows where owner_user_id = auth.uid(), but we
    // also constrain the id explicitly so multi-place owners can't
    // accidentally write to the wrong row.
    const { error } = await supabase
      .from('places')
      .update(patch)
      .eq('id', placeId)
      .eq('owner_user_id', user.id)
    setSaving(false)
    if (error) { setToast({ kind: 'err', msg: error.message }); return false }
    setToast({ kind: 'ok', msg: 'Saved.' })
    setTimeout(() => setToast(null), 2400)
    onSaved()
    return true
  }, [placeId, onSaved])

  return { saving, toast, save }
}

// ============================================================================
// Basics — name, description, category, tags
// ============================================================================
function BasicsSection({ row, onSaved }: { row: PlaceRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(row.id, onSaved)
  const [name,        setName]        = useState(row.name ?? '')
  const [description, setDescription] = useState(row.description ?? '')
  const [category,    setCategory]    = useState<PlaceCategory>(row.category)
  const [tagsText,    setTagsText]    = useState((row.tags ?? []).join(', '))
  const [cuisineText, setCuisineText] = useState((row.cuisine_types ?? []).join(', '))

  // Re-sync if the parent flips to a different place via the switcher.
  useEffect(() => {
    setName(row.name ?? '')
    setDescription(row.description ?? '')
    setCategory(row.category)
    setTagsText((row.tags ?? []).join(', '))
    setCuisineText((row.cuisine_types ?? []).join(', '))
  }, [row.id, row.name, row.description, row.category, row.tags, row.cuisine_types])

  const parsedTags = tagsText
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
  const initialTags = (row.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
  // Cuisines keep the user's casing — they're display tags ("Indonesian",
  // "Japanese") not normalised search filters.
  const parsedCuisines = cuisineText
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
  const initialCuisines = (row.cuisine_types ?? []).map((c) => c.trim()).filter(Boolean)
  const dirty =
    name        !== (row.name ?? '') ||
    description !== (row.description ?? '') ||
    category    !== row.category ||
    parsedTags.length !== initialTags.length ||
    parsedTags.some((t, i) => t !== initialTags[i]) ||
    parsedCuisines.length !== initialCuisines.length ||
    parsedCuisines.some((c, i) => c !== initialCuisines[i])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await save({
      name: name.trim() || row.name, // never null out name — it's NOT NULL
      description: description.trim() || null,
      category,
      tags: parsedTags,
      cuisine_types: parsedCuisines,
    })
  }

  return (
    <SectionCard title="Listing basics">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className={labelCls}>
          <span className={labelTextCls}>Name</span>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Warung Mbok Geol"
            required
          />
        </label>
        <label className={labelCls}>
          <span className={labelTextCls}>Description</span>
          <textarea
            rows={3}
            maxLength={500}
            className={inputCls + ' resize-none'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Apa yang bikin tempatmu istimewa?"
          />
        </label>
        {/* Cuisine types — comma-separated, displayed as yellow pill chips
            on the public profile under the About card. Hidden on the
            profile when empty (non-food places like temples / shops just
            leave it blank). Founder ask: "under the bio we need add
            Cuisine type and the user can add what types of food cuisine". */}
        <label className={labelCls}>
          <span className={labelTextCls}>Cuisine types (comma-separated)</span>
          <input
            className={inputCls}
            value={cuisineText}
            onChange={(e) => setCuisineText(e.target.value)}
            placeholder="Indonesian, Javanese, Halal, Vegetarian"
          />
          <span className="block text-[12px] text-black/55 mt-1">
            What kind of food do you serve? Examples: Indonesian, Japanese, Chinese, Italian, Halal, Vegetarian, Seafood, Cocktails, Cafe. Leave blank if your place doesn't serve food.
          </span>
        </label>
        <label className={labelCls}>
          <span className={labelTextCls}>Category</span>
          <select
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value as PlaceCategory)}
          >
            {GROUPS.map((g) => (
              <optgroup key={g.id} label={g.label}>
                {g.categories.map((cid) => (
                  <option key={cid} value={cid}>{CATEGORIES[cid].label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          <span className={labelTextCls}>Tags (comma-separated)</span>
          <input
            className={inputCls}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="halal, family, open_late"
          />
          <span className="block text-[12px] text-black/55 mt-1">
            Used as searchable filters. Examples: halal, vegetarian, open_24h, family, english_spoken.
          </span>
        </label>
        <div className="flex items-center justify-between gap-3">
          {toast ? <Toast kind={toast.kind}>{toast.msg}</Toast> : <span />}
          <SaveButton saving={saving} dirty={dirty} />
        </div>
      </form>
    </SectionCard>
  )
}

// ============================================================================
// Visit info — address, city, lat, lng, whatsapp
// ============================================================================
function VisitInfoSection({ row, onSaved }: { row: PlaceRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(row.id, onSaved)
  const [address, setAddress] = useState(row.address ?? '')
  const [city,    setCity]    = useState(row.city ?? '')
  const [lat,     setLat]     = useState<string>(row.lat != null ? String(row.lat) : '')
  const [lng,     setLng]     = useState<string>(row.lng != null ? String(row.lng) : '')
  const [whats,   setWhats]   = useState(row.whatsapp_e164 ?? '')

  useEffect(() => {
    setAddress(row.address ?? '')
    setCity(row.city ?? '')
    setLat(row.lat != null ? String(row.lat) : '')
    setLng(row.lng != null ? String(row.lng) : '')
    setWhats(row.whatsapp_e164 ?? '')
  }, [row.id, row.address, row.city, row.lat, row.lng, row.whatsapp_e164])

  const dirty =
    address !== (row.address ?? '') ||
    city    !== (row.city ?? '') ||
    lat     !== (row.lat != null ? String(row.lat) : '') ||
    lng     !== (row.lng != null ? String(row.lng) : '') ||
    whats   !== (row.whatsapp_e164 ?? '')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const latNum = lat === '' ? null : Number(lat)
    const lngNum = lng === '' ? null : Number(lng)
    await save({
      address: address.trim() || null,
      city:    city.trim() || row.city, // city is NOT NULL — never blank it
      lat:     latNum,
      lng:     lngNum,
      whatsapp_e164: whats.trim() || null,
    })
  }

  return (
    <SectionCard title="Visit info">
      <form onSubmit={onSubmit} className="space-y-3">
        <label className={labelCls}>
          <span className={labelTextCls}>Address</span>
          <input
            className={inputCls}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Jl. Malioboro No. 1"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelCls}>
            <span className={labelTextCls}>City</span>
            <input
              className={inputCls}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Yogyakarta"
              required
            />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>WhatsApp (E.164)</span>
            <input
              type="tel"
              className={inputCls}
              value={whats}
              onChange={(e) => setWhats(e.target.value)}
              placeholder="+628123456789"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelCls}>
            <span className={labelTextCls}>Latitude</span>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="-7.7956"
            />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Longitude</span>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="110.3695"
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          {toast ? <Toast kind={toast.kind}>{toast.msg}</Toast> : <span />}
          <SaveButton saving={saving} dirty={dirty} />
        </div>
      </form>
    </SectionCard>
  )
}

// ============================================================================
// Photos — Phase 1: URL list editor (defer real upload to v2)
// ============================================================================
function PhotosSection({ row, onSaved }: { row: PlaceRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(row.id, onSaved)
  const initial = Array.isArray(row.image_urls) ? row.image_urls : []
  const [urls, setUrls] = useState<string[]>(initial.length ? initial : [''])

  useEffect(() => {
    const next = Array.isArray(row.image_urls) ? row.image_urls : []
    setUrls(next.length ? next : [''])
  }, [row.id, row.image_urls])

  const cleaned = urls.map((u) => u.trim()).filter((u) => u.length > 0)
  const initialCleaned = initial.map((u) => (u ?? '').trim()).filter((u) => u.length > 0)
  const dirty =
    cleaned.length !== initialCleaned.length ||
    cleaned.some((u, i) => u !== initialCleaned[i])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await save({ image_urls: cleaned })
  }

  return (
    <SectionCard title="Photos">
      <p className="text-[13px] text-black/70">
        Paste public image URLs (one per row). File upload is coming soon.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-2">
          {urls.map((u, i) => (
            <div key={i} className="flex items-stretch gap-2">
              <input
                className={inputCls}
                value={u}
                onChange={(e) => {
                  const next = urls.slice()
                  next[i] = e.target.value
                  setUrls(next)
                }}
                placeholder="https://…"
              />
              {u && /^https?:\/\//i.test(u) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  const next = urls.filter((_, idx) => idx !== i)
                  setUrls(next.length ? next : [''])
                }}
                className="shrink-0 rounded-xl border border-gray-200 text-black/70 hover:bg-gray-50 px-3 text-[13px] font-bold min-h-[44px]"
                aria-label="Remove"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setUrls([...urls, ''])}
          className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[13px] font-extrabold text-black/80 hover:border-brand min-h-[44px]"
        >
          + Add another URL
        </button>
        <div className="flex items-center justify-between gap-3">
          {toast ? <Toast kind={toast.kind}>{toast.msg}</Toast> : <span />}
          <SaveButton saving={saving} dirty={dirty} />
        </div>
      </form>
    </SectionCard>
  )
}

// ============================================================================
// Offers / Menu — owner CRUD over `place_offers`.
// ----------------------------------------------------------------------------
// Restaurants list menu items, attractions list ticket types, temples and
// galleries can leave price empty for image-only entries. Sort order is a
// numeric input (drag is overkill for v1). Each row has its own Save button
// so a single broken row doesn't block the rest.
// ============================================================================
function OffersSection({ row }: { row: PlaceRow }) {
  const [offers, setOffers] = useState<PlaceOfferRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const reload = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoadError('Supabase not configured.'); setLoading(false); return }
    setLoadError(null)
    const { data, error } = await supabase
      .from('place_offers')
      .select('id, place_id, name, description, price_idr, image_url, sort_order, created_at, updated_at')
      .eq('place_id', row.id)
      .order('sort_order', { ascending: true })
    if (error) { setLoadError(error.message); setLoading(false); return }
    setOffers((data ?? []) as unknown as PlaceOfferRow[])
    setLoading(false)
  }, [row.id])

  useEffect(() => { setLoading(true); reload() }, [reload])

  return (
    <SectionCard title="Offers / Menu">
      <p className="text-[13px] text-black/70 leading-snug">
        Restaurants: list menu items. Attractions: list ticket types. Temples / gallery:
        leave price empty for image-only entries.
      </p>
      <p className="text-[12px] text-black/55 leading-snug">
        Offers self-published by venue · agree price directly when you visit.
      </p>

      {loadError && <Toast kind="err">{loadError}</Toast>}

      {loading ? (
        <div className="text-[13px] text-black/50">Loading offers…</div>
      ) : (
        <div className="space-y-3">
          {offers.length === 0 && !adding && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
              <div className="text-[13px] font-extrabold text-black/70">No offers yet</div>
              <div className="text-[12px] text-black/55 mt-1">
                Add a menu item, ticket type, or highlight to show on your profile.
              </div>
            </div>
          )}

          {offers.map((offer) => (
            <OfferEditor
              key={offer.id}
              placeId={row.id}
              offer={offer}
              onSaved={reload}
              onDeleted={reload}
            />
          ))}

          {adding ? (
            <OfferEditor
              placeId={row.id}
              offer={null}
              defaultSortOrder={
                offers.length > 0
                  ? Math.max(...offers.map((o) => o.sort_order)) + 1
                  : 0
              }
              onSaved={() => { setAdding(false); reload() }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-[13px] font-extrabold text-black/80 hover:border-brand min-h-[44px]"
            >
              <Plus className="w-4 h-4" aria-hidden />
              Add offer
            </button>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// Editor for a single offer row — handles both "edit existing" and "add new"
// via the `offer === null` branch. Local state is the source of truth; we
// only round-trip to Supabase on Save or Delete. Each editor owns its own
// saving / toast state so siblings can be edited independently.
function OfferEditor({
  placeId,
  offer,
  defaultSortOrder = 0,
  onSaved,
  onDeleted,
  onCancel,
}: {
  placeId:           string
  offer:             PlaceOfferRow | null
  defaultSortOrder?: number
  onSaved:           () => void
  onDeleted?:        () => void
  onCancel?:         () => void
}) {
  const isNew = offer === null
  const [name,        setName]        = useState(offer?.name ?? '')
  const [description, setDescription] = useState(offer?.description ?? '')
  const [priceText,   setPriceText]   = useState(offer?.price_idr != null ? String(offer.price_idr) : '')
  const [imageUrl,    setImageUrl]    = useState(offer?.image_url ?? '')
  const [sortOrder,   setSortOrder]   = useState<string>(
    offer ? String(offer.sort_order) : String(defaultSortOrder),
  )
  const [editing, setEditing] = useState(isNew)
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast,   setToast]   = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  // Re-sync if the parent reloaded with a different snapshot of this offer.
  useEffect(() => {
    if (!offer) return
    setName(offer.name ?? '')
    setDescription(offer.description ?? '')
    setPriceText(offer.price_idr != null ? String(offer.price_idr) : '')
    setImageUrl(offer.image_url ?? '')
    setSortOrder(String(offer.sort_order))
  }, [offer?.id, offer?.name, offer?.description, offer?.price_idr, offer?.image_url, offer?.sort_order, offer])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setToast(null)
    if (!name.trim()) { setToast({ kind: 'err', msg: 'Name is required.' }); return }
    const supabase = getBrowserSupabase()
    if (!supabase) { setToast({ kind: 'err', msg: 'Supabase not configured.' }); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setToast({ kind: 'err', msg: 'Not signed in.' }); return }

    // Parse price — empty string means "image-only", null in DB.
    const priceTrimmed = priceText.trim()
    const priceNum = priceTrimmed === '' ? null : Math.round(Number(priceTrimmed))
    if (priceTrimmed !== '' && (!Number.isFinite(priceNum) || (priceNum ?? -1) < 0)) {
      setToast({ kind: 'err', msg: 'Price must be a non-negative integer (IDR).' })
      return
    }
    const sortNum = Math.round(Number(sortOrder))
    if (!Number.isFinite(sortNum)) {
      setToast({ kind: 'err', msg: 'Sort order must be a number.' })
      return
    }

    setSaving(true)
    const payload = {
      place_id:    placeId,
      name:        name.trim(),
      description: description.trim() || null,
      price_idr:   priceNum,
      image_url:   imageUrl.trim() || null,
      sort_order:  sortNum,
    }

    if (isNew) {
      const { error } = await supabase.from('place_offers').insert(payload)
      setSaving(false)
      if (error) { setToast({ kind: 'err', msg: error.message }); return }
      onSaved()
    } else {
      const { error } = await supabase
        .from('place_offers')
        .update(payload)
        .eq('id', offer!.id)
      setSaving(false)
      if (error) { setToast({ kind: 'err', msg: error.message }); return }
      setToast({ kind: 'ok', msg: 'Saved.' })
      setTimeout(() => setToast(null), 2200)
      setEditing(false)
      onSaved()
    }
  }

  async function remove() {
    if (!offer) return
    if (!confirm(`Delete "${offer.name}"? This cannot be undone.`)) return
    const supabase = getBrowserSupabase()
    if (!supabase) { setToast({ kind: 'err', msg: 'Supabase not configured.' }); return }
    setDeleting(true)
    const { error } = await supabase.from('place_offers').delete().eq('id', offer.id)
    setDeleting(false)
    if (error) { setToast({ kind: 'err', msg: error.message }); return }
    onDeleted?.()
  }

  // Compact non-editing summary — image thumb + name + price + truncated
  // description. Edit / Delete buttons hang on the right.
  if (!editing && offer) {
    const priceLabel = offer.price_idr != null
      ? `Rp ${offer.price_idr.toLocaleString('id-ID')}`
      : 'No price'
    const descPreview = (offer.description ?? '').trim()
    const descTruncated = descPreview.length > 80
      ? descPreview.slice(0, 80).trimEnd() + '…'
      : descPreview
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 flex items-start gap-3">
        <OfferThumb url={offer.image_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[15px] font-extrabold text-black truncate">{offer.name}</div>
              <div className="text-[12px] text-black/55">
                {priceLabel} · sort {offer.sort_order}
              </div>
            </div>
          </div>
          {descTruncated && (
            <div className="text-[13px] text-black/70 leading-snug mt-1">{descTruncated}</div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-[12px] font-extrabold text-black/80 min-h-[36px]"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden />
              Edit
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-50 hover:bg-red-100 px-3 py-1.5 text-[12px] font-extrabold text-red-700 min-h-[36px] disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden />
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            {toast && (
              <span
                className={`text-[12px] font-bold ${
                  toast.kind === 'ok' ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {toast.msg}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Editor form — used for both "edit existing" and "add new".
  return (
    <form
      onSubmit={save}
      className="rounded-xl border border-gray-200 bg-white p-3 space-y-2"
    >
      <label className={labelCls}>
        <span className={labelTextCls}>Name *</span>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nasi Goreng Spesial"
          required
        />
      </label>
      <label className={labelCls}>
        <span className={labelTextCls}>Description</span>
        <textarea
          rows={2}
          maxLength={400}
          className={inputCls + ' resize-none'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional — what's in it, why it's special"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={labelCls}>
          <span className={labelTextCls}>Price (IDR)</span>
          <input
            type="number"
            min="0"
            step="1000"
            className={inputCls}
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            placeholder="Leave empty for image-only"
          />
        </label>
        <label className={labelCls}>
          <span className={labelTextCls}>Sort order</span>
          <input
            type="number"
            step="1"
            className={inputCls}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="0"
          />
        </label>
      </div>
      <label className={labelCls}>
        <span className={labelTextCls}>Image URL</span>
        <div className="flex items-stretch gap-2">
          <input
            className={inputCls}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
          {imageUrl && /^https?:\/\//i.test(imageUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
        <span className="block text-[12px] text-black/55 mt-1">
          Optional — paste a public image URL.
        </span>
      </label>

      <div className="flex items-center justify-between gap-3 pt-1">
        {toast ? <Toast kind={toast.kind}>{toast.msg}</Toast> : <span />}
        <div className="flex items-center gap-2">
          {isNew ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[13px] font-extrabold text-black/80 min-h-[44px] disabled:opacity-50"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[13px] font-extrabold text-black/80 min-h-[44px] disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-60"
          >
            {saving ? 'Saving…' : isNew ? 'Add offer' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}

function OfferThumb({ url }: { url: string | null }) {
  if (url && /^https?:\/\//i.test(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0 bg-gray-100"
        onError={(e) => {
          // Swap to placeholder on broken URL so the row layout doesn't shift.
          const img = e.currentTarget as HTMLImageElement
          img.style.visibility = 'hidden'
        }}
      />
    )
  }
  return (
    <div
      aria-hidden
      className="w-14 h-14 rounded-lg border border-gray-200 shrink-0 bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center"
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-yellow-800/70">
        Item
      </span>
    </div>
  )
}

// ============================================================================
// Contact button toggle — single switch controlling places.contact_enabled.
// ----------------------------------------------------------------------------
// When OFF the public profile hides the WhatsApp CTA (and falls back to the
// "Open in Maps" sticky CTA). The transport "Get me there" buttons stay
// visible regardless — transport is independent of venue contact.
// ============================================================================
function ContactToggleSection({ row, onSaved }: { row: PlaceRow; onSaved: () => void }) {
  const initial = row.contact_enabled !== false // default true when null
  const [enabled, setEnabled] = useState(initial)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => { setEnabled(row.contact_enabled !== false) }, [row.id, row.contact_enabled])

  async function flip(next: boolean) {
    setToast(null)
    const supabase = getBrowserSupabase()
    if (!supabase) { setToast({ kind: 'err', msg: 'Supabase not configured.' }); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setToast({ kind: 'err', msg: 'Not signed in.' }); return }
    // Optimistic — the switch flips instantly; on error we revert.
    setEnabled(next)
    setSaving(true)
    const { error } = await supabase
      .from('places')
      .update({ contact_enabled: next })
      .eq('id', row.id)
      .eq('owner_user_id', user.id)
    setSaving(false)
    if (error) {
      setEnabled(!next)
      setToast({ kind: 'err', msg: error.message })
      return
    }
    setToast({ kind: 'ok', msg: 'Saved.' })
    setTimeout(() => setToast(null), 2200)
    onSaved()
  }

  return (
    <SectionCard title="Contact button">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold text-black leading-snug">
            Show WhatsApp contact on public profile
          </div>
          <p className="text-[13px] text-black/65 leading-relaxed mt-1">
            Turn off if this place has no WhatsApp number. The transport
            &ldquo;Get me there&rdquo; button stays visible regardless.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Show WhatsApp contact on public profile"
          onClick={() => flip(!enabled)}
          disabled={saving}
          className={`shrink-0 relative inline-flex items-center rounded-full transition-colors disabled:opacity-60 ${
            enabled ? 'bg-yellow-400' : 'bg-gray-300'
          }`}
          style={{ width: 56, height: 32 }}
        >
          <span
            aria-hidden
            className="inline-block bg-white rounded-full shadow transition-transform"
            style={{
              width: 24,
              height: 24,
              transform: `translateX(${enabled ? 28 : 4}px)`,
            }}
          />
        </button>
      </div>
      {toast && (
        <div className="pt-1">
          <Toast kind={toast.kind}>{toast.msg}</Toast>
        </div>
      )}
    </SectionCard>
  )
}

// ============================================================================
// Hours editor
// ----------------------------------------------------------------------------
// The rest of the codebase stores hours_json as { mon: "HH:MM-HH:MM", ... }
// (string per day) — see src/components/profile/PlaceProfileShell.tsx and
// src/lib/validation/universalProfile.ts.
//
// However the task brief warned that older rows might have the alternative
// shape { mon: { open, close } }. We accept BOTH on read, plus a
// case-insensitive day-key tolerance, and ALWAYS write back the canonical
// string-per-day shape so downstream renderers stay consistent.
// ============================================================================
const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'] as const
type DayKey = typeof DAY_KEYS[number]
const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

type DayRow = { open: string; close: string }
type HoursState = Record<DayKey, DayRow>

const EMPTY_HOURS: HoursState = {
  mon: { open: '', close: '' },
  tue: { open: '', close: '' },
  wed: { open: '', close: '' },
  thu: { open: '', close: '' },
  fri: { open: '', close: '' },
  sat: { open: '', close: '' },
  sun: { open: '', close: '' },
}

// Coerce arbitrary stored hours_json into our { open, close } shape.
// Supports:
//   1. { mon: "08:00-22:00", ... }            (canonical string form)
//   2. { mon: { open: "08:00", close: "22:00" } } (object form)
//   3. { mon: { opens_at, closes_at } } / { from, to } / { start, end }
//   4. Mixed-case day keys ("Mon", "MONDAY", etc.)
//   5. null / undefined / non-object — falls through to EMPTY_HOURS.
function parseHours(raw: unknown): HoursState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_HOURS }
  const src = raw as Record<string, unknown>
  // Normalise keys to lowercase 3-letter for lookup.
  const normalised: Record<string, unknown> = {}
  for (const k of Object.keys(src)) {
    const lower = k.toLowerCase()
    const short = lower.slice(0, 3)
    if ((DAY_KEYS as readonly string[]).includes(short)) {
      normalised[short] = src[k]
    }
  }
  const out: HoursState = { ...EMPTY_HOURS }
  for (const day of DAY_KEYS) {
    const v = normalised[day]
    if (typeof v === 'string') {
      // "08:00-22:00" or "08:00 – 22:00" or similar — split on the
      // first dash-like character and trust the two halves.
      const parts = v.split(/[-–—]/).map((s) => s.trim())
      if (parts.length === 2 && parts[0] && parts[1]) {
        out[day] = { open: parts[0], close: parts[1] }
      } else if (v.trim()) {
        // Single token e.g. "24h" — surface as open only so the owner
        // can fix it.
        out[day] = { open: v.trim(), close: '' }
      }
    } else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      const open =
        (typeof o.open      === 'string' ? o.open      : '') ||
        (typeof o.opens_at  === 'string' ? o.opens_at  : '') ||
        (typeof o.from      === 'string' ? o.from      : '') ||
        (typeof o.start     === 'string' ? o.start     : '')
      const close =
        (typeof o.close     === 'string' ? o.close     : '') ||
        (typeof o.closes_at === 'string' ? o.closes_at : '') ||
        (typeof o.to        === 'string' ? o.to        : '') ||
        (typeof o.end       === 'string' ? o.end       : '')
      if (open || close) out[day] = { open, close }
    }
    // Anything else (number, boolean, null) — leave as empty.
  }
  return out
}

// Serialise to the canonical { mon: "HH:MM-HH:MM" } shape. Days with
// no open AND no close are dropped entirely so the JSON stays tight.
function serialiseHours(state: HoursState): Record<string, string> {
  const out: Record<string, string> = {}
  for (const day of DAY_KEYS) {
    const { open, close } = state[day]
    const o = open.trim()
    const c = close.trim()
    if (o && c) out[day] = `${o}-${c}`
    else if (o) out[day] = o
  }
  return out
}

function hoursEqual(a: HoursState, b: HoursState): boolean {
  for (const day of DAY_KEYS) {
    if (a[day].open !== b[day].open || a[day].close !== b[day].close) return false
  }
  return true
}

function HoursSection({ row, onSaved }: { row: PlaceRow; onSaved: () => void }) {
  const { saving, toast, save } = useSectionSaver(row.id, onSaved)
  const initialState = useMemo(() => parseHours(row.hours_json), [row.hours_json])
  const [hours, setHours] = useState<HoursState>(initialState)

  useEffect(() => { setHours(initialState) }, [row.id, initialState])

  const dirty = !hoursEqual(hours, initialState)

  function setDay(day: DayKey, patch: Partial<DayRow>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = serialiseHours(hours)
    // Empty object is allowed — it signals "no published hours" to the
    // profile renderer, which falls back to the category default.
    await save({ hours_json: payload })
  }

  function clearDay(day: DayKey) {
    setDay(day, { open: '', close: '' })
  }

  return (
    <SectionCard title="Hours">
      <p className="text-[13px] text-black/70">
        Open and close time per day (24h format). Leave a day blank if you&apos;re closed.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-2">
          {DAY_KEYS.map((day) => (
            <div key={day} className="grid grid-cols-[56px_1fr_1fr_auto] items-center gap-2">
              <div className="text-[13px] font-extrabold uppercase tracking-wider text-black/70">
                {DAY_LABELS[day]}
              </div>
              <input
                type="time"
                className={inputCls}
                value={hours[day].open}
                onChange={(e) => setDay(day, { open: e.target.value })}
                placeholder="Open"
                aria-label={`${DAY_LABELS[day]} open`}
              />
              <input
                type="time"
                className={inputCls}
                value={hours[day].close}
                onChange={(e) => setDay(day, { close: e.target.value })}
                placeholder="Close"
                aria-label={`${DAY_LABELS[day]} close`}
              />
              <button
                type="button"
                onClick={() => clearDay(day)}
                disabled={!hours[day].open && !hours[day].close}
                className="shrink-0 rounded-xl border border-gray-200 text-black/70 hover:bg-gray-50 px-3 text-[12px] font-bold min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={`Clear ${DAY_LABELS[day]}`}
              >
                Clear
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          {toast ? <Toast kind={toast.kind}>{toast.msg}</Toast> : <span />}
          <SaveButton saving={saving} dirty={dirty} />
        </div>
      </form>
    </SectionCard>
  )
}

// ============================================================================
// QRIS payment modal
// ----------------------------------------------------------------------------
// Owner scans the QR in their bank/wallet app, pays externally, then
// uploads a screenshot. The /api/dashboard/subscription-payment endpoint
// records the proof and bumps places.paid_until = max(paid_until, today)
// + 30 days, so the listing flips active OPTIMISTICALLY. Admin verifies
// (or reverts) later via /admin/subscriptions.
//
// COMPLIANCE: IndoCity never custodies funds. The QR shown is the
// founder's merchant QRIS — payment is between the owner's bank and the
// founder's bank, not through IndoCity rails.
// ============================================================================
function QrisPaymentModal({
  open,
  placeId,
  placeName,
  onClose,
  onSubmitted,
}: {
  open: boolean
  placeId: string
  placeName: string
  onClose: () => void
  onSubmitted: (activeUntil: string) => void
}) {
  const [file,         setFile]         = useState<File | null>(null)
  const [filePreview,  setFilePreview]  = useState<string | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState<string | null>(null)

  // Reset state every time the modal reopens — stale errors / files
  // shouldn't bleed between attempts.
  useEffect(() => {
    if (open) {
      setFile(null)
      setFilePreview(null)
      setUploading(false)
      setUploadError(null)
    }
  }, [open])

  // Manage the object URL lifecycle for the screenshot preview so we
  // don't leak blobs across selections.
  useEffect(() => {
    if (!file) { setFilePreview(null); return }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Close on Escape — small affordance that costs nothing.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !uploading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, uploading, onClose])

  if (!open) return null

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f && !f.type.startsWith('image/')) {
      setUploadError('Please choose an image file (PNG / JPG).')
      return
    }
    setUploadError(null)
    setFile(f)
  }

  async function submit() {
    if (!file || uploading) return
    setUploadError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('screenshot', file)
      fd.append('vehicleType', 'place')
      fd.append('placeId', placeId)
      const r = await fetch('/api/dashboard/subscription-payment', {
        method: 'POST',
        body: fd,
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setUploadError(j?.error || 'Upload failed. Please try again.')
        setUploading(false)
        return
      }
      // Bubble the active-until back so the parent can flip the banner
      // green immediately. The parent also calls onClose + toast.
      onSubmitted(j.activeUntil as string)
    } catch {
      setUploadError('Network error. Please try again.')
      setUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={() => { if (!uploading) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qris-modal-title"
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-[#0F172A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={uploading}
          aria-label="Close"
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-5 pt-6 pb-5">
          <h2 id="qris-modal-title" className="text-[18px] font-black leading-tight pr-10">
            Pay subscription via QRIS
          </h2>
          <p className="text-[13px] text-black/65 mt-1 leading-snug">
            Pay Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')} to keep your place listing live for 30 days.
          </p>
          <p className="text-[12px] text-black/55 mt-1 leading-snug truncate">
            Listing: <strong>{placeName}</strong>
          </p>

          {/* Amount pill */}
          <div className="mt-4 rounded-xl bg-[#FACC15]/15 border border-[#FACC15] px-4 py-3 flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#0F172A]/80">Amount</span>
            <span className="text-[15px] font-black text-[#0F172A]">
              Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')} <span className="font-bold text-[13px] text-[#0F172A]/70">/ 1 month</span>
            </span>
          </div>

          {/* QR display — white card with padding so it's scannable even
              over the dark backdrop showing through any transparency. */}
          <div className="mt-4 flex justify-center">
            <div className="bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={QRIS_IMAGE_URL}
                alt="IndoCity QRIS payment code"
                width={200}
                height={200}
                className="w-[200px] h-[200px] object-contain block"
              />
            </div>
          </div>

          {/* Steps */}
          <ol className="mt-5 space-y-2 text-[13px] text-black/80">
            <Step n={1}>
              Buka aplikasi banking / dompet digital
              <span className="block text-black/55 text-[12px]">(BCA, Mandiri, GoPay, OVO, Dana, ShopeePay, etc.)</span>
            </Step>
            <Step n={2}>Scan QRIS di atas / Scan the QR above</Step>
            <Step n={3}>Bayar <span className="font-black">Rp {SUBSCRIPTION_IDR.toLocaleString('id-ID')}</span> / Pay the amount</Step>
            <Step n={4}>Screenshot bukti pembayaran / Screenshot the receipt</Step>
            <Step n={5}>Upload screenshot di bawah — listing aktif segera</Step>
          </ol>

          {/* Upload zone */}
          <div className="mt-5">
            <label
              htmlFor="qris-screenshot-input"
              className="block w-full rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#FACC15] bg-gray-50 hover:bg-[#FACC15]/5 transition cursor-pointer"
            >
              <input
                id="qris-screenshot-input"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onPick}
                disabled={uploading}
              />
              {filePreview ? (
                <div className="p-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={filePreview}
                    alt="Screenshot preview"
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold truncate">{file?.name}</div>
                    <div className="text-[12px] text-black/55">Tap to choose a different screenshot</div>
                  </div>
                </div>
              ) : (
                <div className="p-5 flex flex-col items-center justify-center text-center min-h-[88px]">
                  <Upload className="w-5 h-5 text-black/50 mb-1" aria-hidden />
                  <div className="text-[13px] font-extrabold text-[#0F172A]">Choose screenshot</div>
                  <div className="text-[12px] text-black/55 mt-0.5">PNG or JPG of your payment receipt</div>
                </div>
              )}
            </label>
          </div>

          {uploadError && (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-50 text-red-800 text-[13px] px-3 py-2">
              {uploadError}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!file || uploading}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#FACC15] text-[#0F172A] px-5 py-3 text-[13px] font-extrabold min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Uploading…
              </>
            ) : (
              <>Submit payment proof</>
            )}
          </button>

          <p className="mt-3 text-[12px] text-black/55 leading-snug">
            Payment is between you and your bank/wallet. IndoCity is a software directory — we do not custody or process funds.
          </p>

          <div className="mt-3 text-center">
            <a
              href={ADMIN_WA_RENEW}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold text-black/60 hover:text-black hover:underline"
            >
              Need help paying? WhatsApp admin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="shrink-0 w-6 h-6 rounded-full bg-[#0F172A] text-white text-[12px] font-black flex items-center justify-center mt-[1px]"
      >
        {n}
      </span>
      <span className="leading-snug">{children}</span>
    </li>
  )
}

// ============================================================================
// Shell — page chrome (matches /dashboard/car)
// ============================================================================
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-white text-black">
      <AppNav />
      {children}
    </main>
  )
}
