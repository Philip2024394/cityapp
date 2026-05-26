'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppNav from '@/components/layout/AppNav'
import ProfileImageUploader from '@/components/kyc/ProfileImageUploader'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Partner payout setup. Driver-facing surfaces (Partner Debts → "View bank
// details") only show details once this is filled. Until then, drivers see
// "Partner has not configured payout yet — message them on WhatsApp."

type Partner = {
  id: string
  slug: string
  name: string
  payout_method: string | null
  payout_account_number: string | null
  payout_account_name: string | null
  payout_bank_code: string | null
  payout_qris_image_url: string | null
  payout_notes: string | null
}

type Method = 'bank_transfer' | 'qris' | 'gopay' | 'ovo' | 'dana' | 'shopeepay' | 'cash'

const METHODS: { value: Method; label: string; sub: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer', sub: 'BCA · Mandiri · BRI · BNI · others' },
  { value: 'qris',          label: 'QRIS',          sub: 'One QR for every e-wallet + bank' },
  { value: 'gopay',         label: 'GoPay',         sub: 'Account number (phone)' },
  { value: 'ovo',           label: 'OVO',           sub: 'Account number (phone)' },
  { value: 'dana',          label: 'DANA',          sub: 'Account number (phone)' },
  { value: 'shopeepay',     label: 'ShopeePay',     sub: 'Account number (phone)' },
  { value: 'cash',          label: 'Cash on hand',  sub: 'Driver drops cash directly' },
]

const PARTNER_BG_URL =
  'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2004_57_59%20AM.png?updatedAt=1779141503106'

export default function PartnerPayoutPage() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [method, setMethod] = useState<Method>('bank_transfer')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [qrisUrl, setQrisUrl] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  // Owner uid — needed by ProfileImageUploader to scope storage folder.
  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/partners/me/bookings', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { partners: Partner[] }
      const first = j.partners?.[0] ?? null
      setPartner(first)
      if (first) {
        if (first.payout_method) setMethod(first.payout_method as Method)
        setBankCode(first.payout_bank_code ?? '')
        setAccountNumber(first.payout_account_number ?? '')
        setAccountName(first.payout_account_name ?? '')
        setQrisUrl(first.payout_qris_image_url ?? '')
        setNotes(first.payout_notes ?? '')
      }
    } catch {
      setErr('fetch_failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setSaved(false); setErr(null)
    try {
      const r = await fetch('/api/partners/me/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payout_method: method,
          payout_account_number: accountNumber,
          payout_account_name: accountName,
          payout_bank_code: bankCode,
          payout_qris_image_url: qrisUrl,
          payout_notes: notes,
        }),
      })
      const j = await r.json() as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        setErr(j.error || 'update_failed')
        return
      }
      setSaved(true)
      load()
    } catch {
      setErr('network')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Shell><div className="px-4 pt-6 text-ink/50 text-[13px]">Loading…</div></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 pb-24 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/partner/payout" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">
            Sign in
          </Link>
        </div>
      </Shell>
    )
  }
  if (!partner) {
    return (
      <Shell>
        <div className="px-4 pt-20 pb-24 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black mb-2">Not a partner yet</h1>
          <Link href="/partners/signup" className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold inline-block">
            Register as partner
          </Link>
        </div>
      </Shell>
    )
  }

  const showBank   = method === 'bank_transfer'
  const showQris   = method === 'qris'
  const showWallet = ['gopay','ovo','dana','shopeepay'].includes(method)
  const showAccount = showBank || showWallet

  return (
    <Shell>
      <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
        <Link href="/dashboard/partner" className="text-[12px] text-ink/60 hover:text-ink inline-block mb-3">
          ← Back to partner dashboard
        </Link>
        <h1 className="text-[24px] font-black mb-2">Payout details</h1>
        <p className="text-[13px] text-ink/70 mb-6">
          How would you like drivers to pay you the 8% commission?
          Only drivers with an outstanding booking against you can see these
          details — never shown publicly.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Payment method *">
            <div className="grid grid-cols-1 gap-2">
              {METHODS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 rounded-xl p-3 cursor-pointer border transition ${
                    method === opt.value
                      ? 'bg-brand/15 border-brand/50'
                      : 'bg-black/85 border-white/10 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="payout_method"
                    value={opt.value}
                    checked={method === opt.value}
                    onChange={() => setMethod(opt.value)}
                    className="mt-1 accent-brand"
                  />
                  <div className="flex-1">
                    <div className="text-[14px] font-extrabold text-ink">{opt.label}</div>
                    <div className="text-[12px] text-ink/60">{opt.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          {showBank && (
            <Field label="Bank *">
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Pilih bank…</option>
                <option value="BCA">BCA</option>
                <option value="MANDIRI">Mandiri</option>
                <option value="BRI">BRI</option>
                <option value="BNI">BNI</option>
                <option value="CIMB">CIMB Niaga</option>
                <option value="PERMATA">Permata</option>
                <option value="DANAMON">Danamon</option>
                <option value="BSI">BSI</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
          )}

          {showAccount && (
            <>
              <Field label="Account number *">
                <input
                  type="text"
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={showBank ? '1234567890' : '+62 812 3456 7890'}
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Beneficiary name *">
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="As shown on the account"
                  className={inputCls}
                  required
                />
              </Field>
            </>
          )}

          {showQris && userId && (
            <ProfileImageUploader
              value={qrisUrl || null}
              onChange={(v) => setQrisUrl(v ?? '')}
              userId={userId}
              label="QRIS image *"
              helpText="Upload QRIS PNG/JPG · max 5MB. Driver melihat ini saat ingin bayar."
            />
          )}
          {showQris && !userId && (
            <div className="rounded-xl bg-black/40 border border-white/10 p-4 text-[12px] text-muted">
              Loading uploader…
            </div>
          )}

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="e.g. WhatsApp confirmation after transfer please."
              className={inputCls + ' resize-none'}
            />
          </Field>

          {err && err !== 'fetch_failed' && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[13px] px-3 py-2">
              {humaniseError(err)}
            </div>
          )}
          {saved && (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 text-green-200 text-[13px] px-3 py-2">
              Payout details saved. Drivers with outstanding balances can now see them.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand text-bg px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-wider disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save payout details'}
          </button>
        </form>
      </div>
    </Shell>
  )
}

function humaniseError(code: string): string {
  switch (code) {
    case 'invalid_method':           return 'Please pick a payment method.'
    case 'bank_code_required':       return 'Pick your bank.'
    case 'account_number_required':  return 'Enter the account number.'
    case 'account_name_required':    return 'Enter the beneficiary name.'
    case 'qris_image_required':      return 'Add a QRIS image URL.'
    case 'no_partner_rows':          return 'No partner profile linked to this account.'
    case 'service_role_not_configured': return 'Server not ready. Try again.'
    case 'network':                  return "Couldn't connect."
    default:                         return 'Could not save. Try again.'
  }
}

const inputCls =
  'w-full rounded-xl bg-black/85 border border-white/15 px-4 py-3 text-[14px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-brand'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-ink/85 mb-1.5 inline-block">{label}</span>
      {children}
    </label>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-[100dvh] text-ink overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${PARTNER_BG_URL})` }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/75" />
      <AppNav />
      {children}
    </main>
  )
}
