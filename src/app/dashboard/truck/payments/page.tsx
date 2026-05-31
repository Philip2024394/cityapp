'use client'
// ============================================================================
// /dashboard/truck/payments — Payment methods (Phase 1B real implementation)
// ----------------------------------------------------------------------------
// Cloned from /dashboard/car/payments. Same UX, same compliance model.
// Mirrors the beautician payments page UX:
//   - rounded-3xl hero gradient strip + icon at top
//   - section cards, save-on-blur / instant toggles, inline "Saved" flash
//   - loading skeleton on mount
//   - brand yellow (#FACC15 / #EAB308) for accents
//   - mobile-first, 13px text floor, 44px tap targets, max-w-2xl container
//
// ⚠ COMPLIANCE — IMPORTANT:
//   This page is NOT about CityDrivers collecting fares (regulated under
//   Permenhub 118/2018; we are a software directory under PM 12/2019).
//   The toggles here describe WHICH METHODS THE DRIVER ACCEPTS DIRECTLY
//   FROM THE CUSTOMER. CityDrivers never touches the money. There is no
//   Stripe / Midtrans wiring on this surface — none is ever added.
//
// Edited fields (drivers row):
//   - accepts_cash      bool
//   - accepts_qr        bool
//   - accepts_transfer  bool
//   - qr_payment_url    text  (only when accepts_qr)
//   - transfer_details  text  (only when accepts_transfer)
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Wallet, Banknote, QrCode, Landmark, Check, ShieldCheck,
} from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tryLoadDevDriver } from '@/lib/dev/loadDriverSelf'

// ----------------------------------------------------------------------------
// Row shape — only the columns this page edits.
// ----------------------------------------------------------------------------
type PaymentsRow = {
  user_id:          string
  accepts_cash:     boolean | null
  accepts_qr:       boolean | null
  accepts_transfer: boolean | null
  qr_payment_url:   string | null
  transfer_details: string | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauth' }
  | { kind: 'no_supabase' }
  | { kind: 'no_driver' }
  | { kind: 'ready'; row: PaymentsRow }
  | { kind: 'error'; message: string }

// ============================================================================
// Page entry
// ============================================================================
export default function TruckPaymentsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const reload = useCallback(async () => {
    // DEV BYPASS — localhost impersonation via cr-dev-uid cookie.
    const dev = await tryLoadDevDriver()
    if (dev) { setState({ kind: 'ready', row: dev.driver as unknown as PaymentsRow }); return }

    const supabase = getBrowserSupabase()
    if (!supabase) { setState({ kind: 'no_supabase' }); return }
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { setState({ kind: 'unauth' }); return }
    const { data, error } = await supabase
      .from('drivers')
      .select('user_id, accepts_cash, accepts_qr, accepts_transfer, qr_payment_url, transfer_details')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { setState({ kind: 'error', message: error.message }); return }
    if (!data) { setState({ kind: 'no_driver' }); return }
    setState({ kind: 'ready', row: data as unknown as PaymentsRow })
  }, [])

  useEffect(() => { void reload() }, [reload])

  if (state.kind === 'loading')     return <Shell><Skeleton /></Shell>
  if (state.kind === 'no_supabase') return <FullMsg>Auth not configured.</FullMsg>
  if (state.kind === 'unauth')      return <FullMsg cta={{ href: '/login?next=/dashboard/truck/payments', label: 'Sign in' }}>Sign in to edit your payment methods.</FullMsg>
  if (state.kind === 'no_driver')   return <FullMsg cta={{ href: '/signup?role=driver&vehicle=truck', label: 'Create driver profile' }}>No driver profile yet.</FullMsg>
  if (state.kind === 'error')       return <FullMsg>Could not load: {state.message}</FullMsg>

  return <PaymentsEditor row={state.row} onReload={() => void reload()} />
}

// ============================================================================
// Editor
// ============================================================================
function PaymentsEditor({ row, onReload }: { row: PaymentsRow; onReload: () => void }) {
  const [savedFlash, setSavedFlash] = useState(false)

  const save = useCallback(async (patch: Record<string, unknown>): Promise<boolean> => {
    const supabase = getBrowserSupabase()
    if (!supabase) return false
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase.from('drivers').update(patch).eq('user_id', user.id)
    if (error) {
      alert(error.message)
      return false
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1600)
    onReload()
    return true
  }, [onReload])

  const acceptsCash     = row.accepts_cash     ?? false
  const acceptsQr       = row.accepts_qr       ?? false
  const acceptsTransfer = row.accepts_transfer ?? false
  const anyOn = acceptsCash || acceptsQr || acceptsTransfer

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-32">
        <Link
          href="/dashboard/truck"
          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-black/55 hover:text-black mb-3 min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to dashboard
        </Link>

        {/* Hero strip */}
        <div
          className="rounded-3xl p-5 shadow-sm mb-4"
          style={{
            background: 'linear-gradient(135deg, #FACC15 0%, #FEF9C3 100%)',
            border: '1px solid rgba(234,179,8,0.35)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0"
              style={{ background: '#EAB308', color: '#0A0A0A' }}
            >
              <Wallet size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-[20px] font-black leading-tight text-[#0A0A0A] truncate">Payment methods</h1>
                <span
                  className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 border transition ${
                    savedFlash
                      ? 'text-emerald-700 bg-emerald-100 border-emerald-200'
                      : 'text-[#854D0E] bg-white/70 border-[#FACC15]'
                  }`}
                >
                  {savedFlash ? <><Check size={11} strokeWidth={3} /> Saved</> : 'Live'}
                </span>
              </div>
              <p className="text-[12.5px] text-[#0A0A0A]/75 leading-snug">
                These are the methods <strong>you</strong> accept directly from customers. CityDrivers never touches your money.
              </p>
            </div>
          </div>
        </div>

        {/* Compliance note — second reinforcement */}
        <div className="rounded-2xl border border-[#FACC15]/50 bg-[#FFFBEA] p-3 mb-4 flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-[#EAB308] shrink-0 mt-0.5" strokeWidth={2.5} />
          <p className="text-[12.5px] text-[#854D0E] leading-snug">
            Money flows directly between you and your customer. CityDrivers is a software directory
            (Permenhub 118/2018) — we never custody funds and never charge ride fees on your behalf.
          </p>
        </div>

        {/* Method toggles */}
        <MethodToggle
          icon={<Banknote size={18} strokeWidth={2.5} />}
          title="Cash"
          subtitle="Customer pays you in person at the end of the trip."
          active={acceptsCash}
          onToggle={(v) => save({ accepts_cash: v })}
        />

        <MethodToggle
          icon={<QrCode size={18} strokeWidth={2.5} />}
          title="QRIS / QR code"
          subtitle="Customer scans your QR (GoPay, OVO, Dana, BCA, ShopeePay, …)."
          active={acceptsQr}
          onToggle={(v) => save({ accepts_qr: v })}
        >
          {acceptsQr && (
            <QrUrlInput
              initial={row.qr_payment_url ?? ''}
              onCommit={(v) => save({ qr_payment_url: v })}
            />
          )}
        </MethodToggle>

        <MethodToggle
          icon={<Landmark size={18} strokeWidth={2.5} />}
          title="Bank transfer"
          subtitle="Customer transfers to your bank account."
          active={acceptsTransfer}
          onToggle={(v) => save({ accepts_transfer: v })}
        >
          {acceptsTransfer && (
            <TransferDetailsInput
              initial={row.transfer_details ?? ''}
              onCommit={(v) => save({ transfer_details: v })}
            />
          )}
        </MethodToggle>

        {/* Empty-state nudge */}
        {!anyOn && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-amber-900">No methods on</div>
              <p className="text-[12px] text-amber-900/85 leading-snug mt-0.5">
                Turn on at least one method so customers know how to pay you.
              </p>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

// ============================================================================
// MethodToggle — big card with a switch and optional child detail panel
// ============================================================================
function MethodToggle({
  icon, title, subtitle, active, onToggle, children,
}: {
  icon:      React.ReactNode
  title:     string
  subtitle:  string
  active:    boolean
  onToggle:  (next: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <section className="rounded-3xl bg-white border border-gray-200 p-5 shadow-sm mb-4">
      <button
        type="button"
        onClick={() => onToggle(!active)}
        aria-pressed={active}
        className="w-full text-left flex items-center gap-3 min-h-[44px]"
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition"
          style={{
            background:  active ? '#FACC15' : '#FEF9C3',
            color:       active ? '#0A0A0A' : '#854D0E',
            border:      active ? '1px solid #EAB308' : '1px solid rgba(250,204,21,0.45)',
            boxShadow:   active ? '0 2px 8px rgba(250,204,21,0.30)' : 'none',
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-black text-[#0A0A0A] leading-tight">{title}</div>
          <div className="text-[12px] text-black/60 leading-snug mt-0.5">{subtitle}</div>
        </div>
        <Switch on={active} />
      </button>
      {children && <div className="mt-3">{children}</div>}
    </section>
  )
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center w-11 h-6 rounded-full transition"
      style={{
        background: on ? '#FACC15' : '#E4E4E7',
        border: `1px solid ${on ? '#EAB308' : '#D4D4D8'}`,
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-[left]"
        style={{ left: on ? 22 : 2 }}
      />
    </span>
  )
}

// ============================================================================
// QR payment URL — optional. Save on blur.
// ============================================================================
function QrUrlInput({ initial, onCommit }: { initial: string; onCommit: (v: string | null) => void }) {
  const [val, setVal] = useState(initial)
  useEffect(() => { setVal(initial) }, [initial])

  function commit() {
    const v = val.trim()
    if (v === initial.trim()) return
    onCommit(v || null)
  }

  return (
    <div className="space-y-2 rounded-2xl bg-[#FFFBEA] border border-[#FACC15]/40 p-3">
      <label className="block">
        <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 mb-1 inline-block">
          QR image URL (optional)
        </span>
        <input
          type="url"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          placeholder="https://… (link to your QRIS image)"
          autoComplete="off"
          className={inputCls}
        />
        <p className="text-[11.5px] text-black/55 leading-snug mt-1">
          Paste a public URL of your QRIS image. Customers can scan it from your profile.
        </p>
      </label>
      {val && /^https?:\/\//i.test(val) && (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={val}
            alt="Your QR preview"
            className="w-32 h-32 rounded-xl object-contain border border-gray-200 bg-white p-1"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Bank transfer details — textarea. Save on blur.
// ============================================================================
function TransferDetailsInput({ initial, onCommit }: { initial: string; onCommit: (v: string | null) => void }) {
  const [val, setVal] = useState(initial)
  useEffect(() => { setVal(initial) }, [initial])

  function commit() {
    const v = val.trim()
    if (v === initial.trim()) return
    onCommit(v || null)
  }

  return (
    <div className="rounded-2xl bg-[#FFFBEA] border border-[#FACC15]/40 p-3">
      <label className="block">
        <span className="text-[12px] font-extrabold uppercase tracking-wider text-black/70 mb-1 inline-block">
          Bank transfer details
        </span>
        <textarea
          rows={3}
          maxLength={300}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          placeholder={'BCA 1234567890\na/n Nama Driver'}
          className={inputCls + ' resize-none'}
        />
        <p className="text-[11.5px] text-black/55 leading-snug mt-1">
          Bank name + account number + account holder name. Shown to customers when they tap Bank transfer.
        </p>
      </label>
    </div>
  )
}

// ============================================================================
// Shell, skeleton, full-page message
// ============================================================================
function Skeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-32 animate-pulse">
      <div className="h-4 w-32 rounded bg-gray-200 mb-3" />
      <div className="rounded-3xl bg-gray-100 h-24 mb-4" />
      <div className="rounded-2xl bg-gray-100 h-14 mb-4" />
      <div className="rounded-3xl bg-gray-100 h-20 mb-4" />
      <div className="rounded-3xl bg-gray-100 h-20 mb-4" />
      <div className="rounded-3xl bg-gray-100 h-20 mb-4" />
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] bg-[#F5F5F4] text-[#0A0A0A]">
      <AppNav />
      {children}
    </main>
  )
}

function FullMsg({
  children, cta,
}: {
  children: React.ReactNode
  cta?:     { href: string; label: string }
}) {
  return (
    <Shell>
      <div className="max-w-md mx-auto px-4 pt-24 text-center">
        <div className="text-[14px] font-bold text-black/70 leading-relaxed">{children}</div>
        {cta && (
          <Link
            href={cta.href}
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FACC15] text-[#0A0A0A] text-[13px] font-extrabold shadow-[0_8px_24px_rgba(250,204,21,0.45)] active:scale-[0.97] transition"
            style={{ minHeight: 44 }}
          >
            {cta.label}
          </Link>
        )}
      </div>
    </Shell>
  )
}

const inputCls =
  'w-full rounded-xl bg-white border border-gray-300 px-3 py-3 text-[14px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#EAB308] focus:ring-2 focus:ring-yellow-100 min-h-[44px]'
