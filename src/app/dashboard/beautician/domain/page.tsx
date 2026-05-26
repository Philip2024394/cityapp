'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Globe2, Check } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import { type BeauticianProvider } from '@/lib/beautician/types'

// Buy custom domain — beautician picks up to 3 .my.id name candidates
// and submits contact details. Admin registers on their behalf and
// follows up on WhatsApp with payment instructions. Rp 150.000 / year.
//
// Same form as the legacy DomainRequestModal but rendered as a full
// page reachable from the drawer (and from the hub) so the surface is
// discoverable, not buried inside the live editor.


export default function BeauticianDomainPage() {
  const [provider, setProvider] = useState<BeauticianProvider | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/beautician/me', { cache: 'no-store' })
      if (r.status === 401) { setErr('not_signed_in'); return }
      const j = await r.json() as { provider: BeauticianProvider | null }
      setProvider(j.provider)
    } catch { setErr('fetch_failed') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  if (loading) return <Shell><div className="px-4 pt-6 text-black/70 text-[14px]">Loading…</div></Shell>
  if (err === 'not_signed_in') {
    return (
      <Shell>
        <div className="px-4 pt-20 max-w-md mx-auto text-center">
          <h1 className="text-[20px] font-black text-black mb-2">Sign in required</h1>
          <Link href="/login?next=/dashboard/beautician/domain" className="rounded-full bg-yellow-400 text-yellow-900 px-6 py-3 text-[14px] font-extrabold inline-block">Sign in</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="px-4 pt-3 pb-28 max-w-lg mx-auto">
        <header className="mb-5 flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-yellow-400 text-yellow-900 shadow-md shadow-yellow-400/20">
            <Globe2 size={18} />
          </div>
          <div>
            <h1 className="text-[24px] font-black text-black leading-tight">Buy a custom domain</h1>
            <p className="text-[13px] text-black/70 mt-1">
              We register a <span className="font-bold text-white">.my.id</span> domain for you and point it at your profile.
              {' '}<span className="font-bold text-yellow-300">Rp 150.000 / year.</span>
            </p>
          </div>
        </header>

        <DomainForm provider={provider} />
      </div>
    </Shell>
  )
}

function DomainForm({ provider }: { provider: BeauticianProvider | null }) {
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [d1, setD1] = useState('')
  const [d2, setD2] = useState('')
  const [d3, setD3] = useState('')
  const [name, setName] = useState(provider?.display_name ?? '')
  const [wa,   setWa]   = useState(provider?.whatsapp_e164 ?? '')
  const [city, setCity] = useState(provider?.city ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function clean(v: string): string {
    return v.trim().toLowerCase().replace(/\.my\.id$/i, '').replace(/[^a-z0-9-]/g, '')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const c1 = clean(d1)
    if (c1.length < 3)              { setError('Domain choice 1 must be at least 3 characters.'); return }
    if (name.trim().length < 2)     { setError('Please add your full name.'); return }
    const waDigits = wa.replace(/\s|-/g, '')
    if (!/^\+?\d{8,15}$/.test(waDigits)) {
      setError('Please add a valid WhatsApp number.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/beautician/me/request-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_choice_1:  c1,
          domain_choice_2:  clean(d2) || undefined,
          domain_choice_3:  clean(d3) || undefined,
          contact_name:     name.trim(),
          contact_whatsapp: wa.trim(),
          contact_city:     city.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) { setError(j?.error || 'Could not send your request.'); return }
      setStep('done')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'done') {
    return (
      <Card>
        <div className="text-center py-3">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3 bg-yellow-400 text-yellow-900">
            <Check className="w-7 h-7" strokeWidth={3} />
          </div>
          <h3 className="text-white text-[18px] font-extrabold">Request sent</h3>
          <p className="text-black/70 text-[13px] mt-1.5 leading-snug max-w-sm mx-auto">
            We&apos;ll message you on WhatsApp within 1 business day with availability and the payment link.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card title="Choose up to 3 names" hint="We'll try the top choice first. The .my.id suffix is added automatically.">
        <DomainField label="Your top choice" value={d1} onChange={setD1} placeholder="dewibeauty" required />
        <DomainField label="Alternative 1"   value={d2} onChange={setD2} placeholder="dewi-beauty" />
        <DomainField label="Alternative 2"   value={d3} onChange={setD3} placeholder="dewibeauty-bali" />
      </Card>

      <Card title="Your details" hint="We'll message this number with availability + payment.">
        <ContactField label="Full name"        value={name} onChange={setName} />
        <ContactField label="WhatsApp (+62…)"  value={wa}   onChange={setWa}   inputMode="tel" />
        <ContactField label="City (optional)"  value={city} onChange={setCity} />
      </Card>

      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 text-rose-100 text-[13px] px-4 py-3">
          {error}
        </div>
      )}

      <div className="sticky bottom-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 px-6 py-4 text-[15px] font-extrabold uppercase tracking-wider disabled:opacity-60 shadow-lg shadow-yellow-400/30"
        >
          {busy ? 'Sending…' : 'Send request'}
        </button>
        <p className="text-white/50 text-[11px] text-center mt-2">
          We&apos;ll WhatsApp you within 1 business day to confirm availability and payment.
        </p>
      </div>
    </form>
  )
}

function DomainField({
  label, value, onChange, placeholder, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-bold text-black/85 block">
        {label}{required && <span className="text-yellow-300"> *</span>}
      </span>
      <div className="flex items-stretch rounded-xl bg-gray-100 border border-gray-200 overflow-hidden focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/30">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-[14px] px-3 py-3 outline-none placeholder-white/40 min-h-[44px]"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <span className="px-3 flex items-center text-white/80 text-[13px] font-extrabold border-l border-white/10 bg-black/40">
          .my.id
        </span>
      </div>
    </label>
  )
}

function ContactField({
  label, value, onChange, inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  inputMode?: 'text' | 'tel'
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-bold text-black/85 block">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 min-h-[44px]"
      />
    </label>
  )
}

function Card({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      {title && (
        <div>
          <h2 className="text-[15px] font-black text-black">{title}</h2>
          {hint && <p className="text-[12px] text-black/65 leading-snug mt-1">{hint}</p>}
        </div>
      )}
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
