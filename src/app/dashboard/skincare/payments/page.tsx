'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, CreditCard, Globe, MessageCircle, Eye, EyeOff, Copy, Check, Loader2, X, ExternalLink, Webhook, ShieldCheck } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import AppNav from '@/components/layout/AppNav'

// /dashboard/skincare/payments — vendor wires up their own Stripe or
// Midtrans account. Card data never touches CityDrivers; we hold encrypted
// API credentials and surface the webhook URL the vendor pastes into
// their provider dashboard. WhatsApp-only ('none') is the default and
// keeps the public profile in its lightweight messaging mode.

type PaymentProvider = 'none' | 'stripe' | 'midtrans'

type PaymentState = {
  payment_provider:        PaymentProvider
  stripe_publishable_key:  string | null
  stripe_last4:            string
  midtrans_client_key:     string | null
  midtrans_last4:          string
  midtrans_is_production:  boolean
}

const DEFAULT_STATE: PaymentState = {
  payment_provider:       'none',
  stripe_publishable_key: null,
  stripe_last4:           '',
  midtrans_client_key:    null,
  midtrans_last4:         '',
  midtrans_is_production: false,
}

export default function SkincarePaymentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [state,   setState]   = useState<PaymentState>(DEFAULT_STATE)
  const [saving,  setSaving]  = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) { setLoading(false); return }
    const { data } = await supabase.auth.getSession()
    if (!data?.session?.user) { router.replace('/login?next=/dashboard/skincare/payments'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/skincare/me/payments', { cache: 'no-store' })
      if (r.ok) {
        const j = await r.json() as PaymentState & { ok: boolean }
        setState({
          payment_provider:       j.payment_provider ?? 'none',
          stripe_publishable_key: j.stripe_publishable_key ?? null,
          stripe_last4:           j.stripe_last4 ?? '',
          midtrans_client_key:    j.midtrans_client_key ?? null,
          midtrans_last4:         j.midtrans_last4 ?? '',
          midtrans_is_production: !!j.midtrans_is_production,
        })
      }
    } finally { setLoading(false) }
  }, [router])
  useEffect(() => { void load() }, [load])

  async function save(patch: Record<string, unknown>) {
    setSaving(true)
    try {
      const r = await fetch('/api/skincare/me/payments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        alert(j?.error || 'Could not save.'); return false
      }
      setState({
        payment_provider:       j.payment_provider,
        stripe_publishable_key: j.stripe_publishable_key,
        stripe_last4:           j.stripe_last4,
        midtrans_client_key:    j.midtrans_client_key,
        midtrans_last4:         j.midtrans_last4,
        midtrans_is_production: j.midtrans_is_production,
      })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
      return true
    } finally { setSaving(false) }
  }

  if (loading) return <Shell><Loading /></Shell>

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-32">
        {/* Brand header — same gradient strip as edit/promos pages */}
        <div className="rounded-3xl border border-pink-200/70 bg-gradient-to-br from-pink-50 to-white p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <DollarSign size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-black truncate">Accept payments</h1>
                <span className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 border transition ${
                  savedFlash
                    ? 'text-emerald-700 bg-emerald-100 border-emerald-200 opacity-100'
                    : 'text-pink-600 bg-pink-100 border-pink-200 opacity-100'
                }`}>
                  {savedFlash ? <><Check size={11} strokeWidth={3} /> Saved</> : 'Live'}
                </span>
              </div>
              <p className="text-[12.5px] text-black/70 leading-snug">
                Customers pay you directly. Cards never touch CityDrivers. Bring your own Stripe or Midtrans keys.
              </p>
            </div>
          </div>
        </div>

        {/* 1. Provider picker */}
        <Section title="Choose a provider" icon={<CreditCard size={16} strokeWidth={2.5} />}>
          <div className="space-y-2">
            <ProviderTile
              active={state.payment_provider === 'none'}
              onClick={() => save({ payment_provider: 'none' })}
              icon={<MessageCircle size={18} strokeWidth={2.5} />}
              title="Off — WhatsApp only"
              subtitle="Customer messages you to order. No checkout button."
            />
            <ProviderTile
              active={state.payment_provider === 'stripe'}
              onClick={() => save({ payment_provider: 'stripe' })}
              icon={<Globe size={18} strokeWidth={2.5} />}
              title="Stripe — Cards worldwide"
              subtitle="Best for international clients. Visa, Mastercard, Amex."
            />
            <ProviderTile
              active={state.payment_provider === 'midtrans'}
              onClick={() => save({ payment_provider: 'midtrans' })}
              icon={<ShieldCheck size={18} strokeWidth={2.5} />}
              title="Midtrans — Indonesia"
              subtitle="Cards, QRIS, GoPay, ShopeePay, bank transfer (IDR)."
            />
          </div>
        </Section>

        {/* 2. Stripe keys */}
        {state.payment_provider === 'stripe' && (
          <Section title="Stripe keys" icon={<Globe size={16} strokeWidth={2.5} />}>
            <StripeKeys
              publishable={state.stripe_publishable_key}
              last4={state.stripe_last4}
              onSave={save}
              saving={saving}
            />
          </Section>
        )}

        {/* 3. Midtrans keys */}
        {state.payment_provider === 'midtrans' && (
          <Section title="Midtrans keys" icon={<ShieldCheck size={16} strokeWidth={2.5} />}>
            <MidtransKeys
              clientKey={state.midtrans_client_key}
              last4={state.midtrans_last4}
              isProd={state.midtrans_is_production}
              onSave={save}
              saving={saving}
            />
          </Section>
        )}

        {/* 4. Webhook setup */}
        {state.payment_provider !== 'none' && (
          <Section title="Webhook setup" icon={<Webhook size={16} strokeWidth={2.5} />}>
            <WebhookSetup provider={state.payment_provider} />
          </Section>
        )}

        {/* 5. Status / preview */}
        <Section title="What customers see" icon={<Eye size={16} strokeWidth={2.5} />}>
          <StatusPreview state={state} />
        </Section>
      </div>
    </Shell>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Provider picker tile — same pick-one UX as the Avatar Frame picker
// ─────────────────────────────────────────────────────────────────────

function ProviderTile({
  active, onClick, icon, title, subtitle,
}: {
  active:   boolean
  onClick:  () => void
  icon:     React.ReactNode
  title:    string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl p-3 border transition active:scale-[0.99] flex items-center gap-3 min-h-[64px] ${
        active
          ? 'bg-pink-500 text-white border-pink-500 shadow-[0_2px_10px_rgba(236,72,153,0.35)]'
          : 'bg-gray-50 text-black border-gray-200 hover:bg-gray-100'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        active ? 'bg-white/20 text-white' : 'bg-white text-pink-500 border border-gray-200'
      }`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-extrabold leading-tight">{title}</div>
        <div className={`text-[12px] leading-snug mt-0.5 ${active ? 'text-white/85' : 'text-black/55'}`}>
          {subtitle}
        </div>
      </div>
      {active && (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-pink-500 shrink-0">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stripe keys editor
// ─────────────────────────────────────────────────────────────────────

function StripeKeys({
  publishable, last4, onSave, saving,
}: {
  publishable: string | null
  last4:       string
  onSave:      (patch: Record<string, unknown>) => Promise<boolean>
  saving:      boolean
}) {
  const [secret,  setSecret]  = useState('')
  const [pub,     setPub]     = useState(publishable ?? '')
  const [showSec, setShowSec] = useState(false)

  useEffect(() => { setPub(publishable ?? '') }, [publishable])

  async function commit() {
    const ok = await onSave({
      // Empty string preserves existing ciphertext per the API contract.
      stripe_secret_key:      secret.trim(),
      stripe_publishable_key: pub.trim() || null,
    })
    if (ok) setSecret('')
  }

  return (
    <div className="space-y-3">
      {/* Secret key */}
      <div className="space-y-1">
        <label className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">
          Secret key (sk_live_… or sk_test_…)
        </label>
        <div className="relative">
          <input
            type={showSec ? 'text' : 'password'}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onBlur={() => { if (secret.trim()) void commit() }}
            placeholder={last4 ? `•••• ${last4} (leave blank to keep)` : 'sk_live_…'}
            autoComplete="off"
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 pr-10 text-[13px] font-mono text-black placeholder:text-black/40 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 min-h-[44px]"
          />
          <button
            type="button"
            onClick={() => setShowSec((v) => !v)}
            aria-label={showSec ? 'Hide secret' : 'Show secret'}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-black/55 hover:text-black hover:bg-gray-100 flex items-center justify-center"
          >
            {showSec ? <EyeOff size={15} strokeWidth={2.5} /> : <Eye size={15} strokeWidth={2.5} />}
          </button>
        </div>
        {last4 && !secret && (
          <p className="text-[12px] text-emerald-700 font-bold">Saved ending in {last4}</p>
        )}
      </div>

      {/* Publishable key */}
      <div className="space-y-1">
        <label className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">
          Publishable key (pk_live_… or pk_test_…)
        </label>
        <input
          type="text"
          value={pub}
          onChange={(e) => setPub(e.target.value)}
          onBlur={() => void commit()}
          placeholder="pk_live_…"
          autoComplete="off"
          className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 text-[13px] font-mono text-black placeholder:text-black/40 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 min-h-[44px]"
        />
      </div>

      <p className="text-[12px] text-black/55 leading-snug">
        Get these at{' '}
        <a
          href="https://dashboard.stripe.com/apikeys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 font-bold underline inline-flex items-center gap-0.5"
        >
          dashboard.stripe.com/apikeys
          <ExternalLink size={11} strokeWidth={2.5} />
        </a>
        . The secret key never leaves our server in plaintext.
      </p>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={commit}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider disabled:opacity-50 transition min-h-[44px]"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
          Save keys
        </button>
        <TestConnectionButton provider="stripe" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Midtrans keys editor
// ─────────────────────────────────────────────────────────────────────

function MidtransKeys({
  clientKey, last4, isProd, onSave, saving,
}: {
  clientKey: string | null
  last4:     string
  isProd:    boolean
  onSave:    (patch: Record<string, unknown>) => Promise<boolean>
  saving:    boolean
}) {
  const [server,  setServer]  = useState('')
  const [client,  setClient]  = useState(clientKey ?? '')
  const [showSec, setShowSec] = useState(false)

  useEffect(() => { setClient(clientKey ?? '') }, [clientKey])

  async function commit() {
    const ok = await onSave({
      midtrans_server_key: server.trim(),
      midtrans_client_key: client.trim() || null,
    })
    if (ok) setServer('')
  }

  return (
    <div className="space-y-3">
      {/* Server key */}
      <div className="space-y-1">
        <label className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">
          Server key
        </label>
        <div className="relative">
          <input
            type={showSec ? 'text' : 'password'}
            value={server}
            onChange={(e) => setServer(e.target.value)}
            onBlur={() => { if (server.trim()) void commit() }}
            placeholder={last4 ? `•••• ${last4} (leave blank to keep)` : 'SB-Mid-server-…'}
            autoComplete="off"
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 pr-10 text-[13px] font-mono text-black placeholder:text-black/40 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 min-h-[44px]"
          />
          <button
            type="button"
            onClick={() => setShowSec((v) => !v)}
            aria-label={showSec ? 'Hide secret' : 'Show secret'}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-black/55 hover:text-black hover:bg-gray-100 flex items-center justify-center"
          >
            {showSec ? <EyeOff size={15} strokeWidth={2.5} /> : <Eye size={15} strokeWidth={2.5} />}
          </button>
        </div>
        {last4 && !server && (
          <p className="text-[12px] text-emerald-700 font-bold">Saved ending in {last4}</p>
        )}
      </div>

      {/* Client key */}
      <div className="space-y-1">
        <label className="text-[12px] font-extrabold uppercase tracking-wider text-black/70">
          Client key
        </label>
        <input
          type="text"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          onBlur={() => void commit()}
          placeholder="SB-Mid-client-…"
          autoComplete="off"
          className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 text-[13px] font-mono text-black placeholder:text-black/40 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 min-h-[44px]"
        />
      </div>

      {/* Env toggle */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold text-black">Environment</div>
          <div className="text-[12px] text-black/55 leading-snug">
            {isProd ? 'Production — real money moves.' : 'Sandbox — for testing.'}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onSave({ midtrans_is_production: false })}
            className={`px-3 py-2 rounded-lg text-[12px] font-extrabold uppercase tracking-wider transition min-h-[40px] ${
              !isProd ? 'bg-pink-500 text-white' : 'bg-white text-black/65 border border-gray-200'
            }`}
          >
            Sandbox
          </button>
          <button
            type="button"
            onClick={() => onSave({ midtrans_is_production: true })}
            className={`px-3 py-2 rounded-lg text-[12px] font-extrabold uppercase tracking-wider transition min-h-[40px] ${
              isProd ? 'bg-pink-500 text-white' : 'bg-white text-black/65 border border-gray-200'
            }`}
          >
            Production
          </button>
        </div>
      </div>

      <p className="text-[12px] text-black/55 leading-snug">
        Get keys at{' '}
        <a
          href="https://dashboard.midtrans.com/settings/config_info"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 font-bold underline inline-flex items-center gap-0.5"
        >
          dashboard.midtrans.com → Settings → Access Keys
          <ExternalLink size={11} strokeWidth={2.5} />
        </a>
        . Server key is encrypted at rest.
      </p>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={commit}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider disabled:opacity-50 transition min-h-[44px]"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
          Save keys
        </button>
        <TestConnectionButton provider="midtrans" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Test connection button — calls /test, reflects success/error inline
// ─────────────────────────────────────────────────────────────────────

function TestConnectionButton({ provider }: { provider: 'stripe' | 'midtrans' }) {
  const [busy,   setBusy]   = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function run() {
    setBusy(true); setResult(null)
    try {
      const r = await fetch('/api/skincare/me/payments/test', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ provider }),
      })
      const j = await r.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (j.ok) setResult({ ok: true,  msg: 'Connection looks good' })
      else      setResult({ ok: false, msg: j.error || 'Connection failed' })
    } catch {
      setResult({ ok: false, msg: 'Network error' })
    } finally {
      setBusy(false)
      setTimeout(() => setResult(null), 4000)
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-[12px] font-extrabold uppercase tracking-wider transition min-h-[44px] min-w-[44px] ${
        result?.ok === true
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : result?.ok === false
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-white border-gray-200 text-black/70 hover:bg-gray-50'
      }`}
      title={result?.msg}
    >
      {busy ? <Loader2 size={14} className="animate-spin" />
        : result?.ok === true  ? <Check size={14} strokeWidth={3} />
        : result?.ok === false ? <X size={14} strokeWidth={3} />
        : null}
      {!result && !busy && 'Test'}
      {result?.ok === true  && 'OK'}
      {result?.ok === false && 'Failed'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Webhook setup — copy URL + checklist
// ─────────────────────────────────────────────────────────────────────

function WebhookSetup({ provider }: { provider: 'stripe' | 'midtrans' }) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const url = origin
    ? (provider === 'stripe'
        ? `${origin}/api/webhooks/stripe`
        : `${origin}/api/webhooks/midtrans`)
    : ''

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('Copy failed — select and copy manually.')
    }
  }

  const steps = provider === 'stripe'
    ? [
        'Open dashboard.stripe.com → Developers → Webhooks',
        'Click "Add endpoint"',
        'Paste the URL above as the endpoint URL',
        'Select events: checkout.session.completed, payment_intent.succeeded',
        'Save and copy the signing secret into a future setup screen (coming soon)',
      ]
    : [
        'Open dashboard.midtrans.com → Settings → Configuration',
        'Find "Payment Notification URL"',
        'Paste the URL above',
        'Save changes',
      ]

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-black/55 mb-1.5">
          Webhook URL
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[12px] font-mono text-black break-all bg-white border border-gray-200 rounded-lg px-2.5 py-2">
            {url || '…'}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy webhook URL"
            className={`shrink-0 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-[12px] font-extrabold uppercase tracking-wider transition min-h-[40px] min-w-[44px] ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-pink-500 text-white hover:bg-pink-600'
            }`}
          >
            {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} strokeWidth={2.5} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-black/80 leading-snug">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-100 text-pink-600 text-[11px] font-extrabold shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Status banner
// ─────────────────────────────────────────────────────────────────────

function StatusPreview({ state }: { state: PaymentState }) {
  if (state.payment_provider === 'none') {
    return (
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-start gap-2.5">
        <MessageCircle size={18} className="text-black/55 shrink-0 mt-0.5" strokeWidth={2.5} />
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold text-black">WhatsApp-only mode</div>
          <p className="text-[12px] text-black/60 leading-snug mt-0.5">
            Your public profile uses WhatsApp for orders. Customers tap Contact and message you.
          </p>
        </div>
      </div>
    )
  }

  const hasKeys = state.payment_provider === 'stripe'
    ? !!(state.stripe_publishable_key && state.stripe_last4)
    : !!(state.midtrans_client_key && state.midtrans_last4)

  if (!hasKeys) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5">
        <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" strokeWidth={2.5} />
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold text-amber-900">Keys missing</div>
          <p className="text-[12px] text-amber-900/85 leading-snug mt-0.5">
            Add both keys above to enable checkout. Until then, your profile stays on WhatsApp mode.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2.5">
      <Check size={18} className="text-emerald-700 shrink-0 mt-0.5" strokeWidth={3} />
      <div className="min-w-0">
        <div className="text-[13px] font-extrabold text-emerald-900">Checkout enabled</div>
        <p className="text-[12px] text-emerald-900/85 leading-snug mt-0.5">
          Your public profile shows a cart with checkout. Customers will see a Pay button powered by{' '}
          {state.payment_provider === 'stripe' ? 'Stripe' : `Midtrans (${state.midtrans_is_production ? 'production' : 'sandbox'})`}.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Layout helpers — same shape as edit/page.tsx
// ─────────────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm space-y-3 mb-4">
      <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-black/70">
        {icon && (
          <span className="w-7 h-7 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
            {icon}
          </span>
        )}
        <span>{title}</span>
      </div>
      {children}
    </section>
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
function Loading() {
  return <div className="flex items-center justify-center pt-32"><div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>
}
