'use client'
import { useEffect, useState } from 'react'
import { X, Globe2, Check } from 'lucide-react'

type Props = {
  open:        boolean
  onClose:     () => void
  themeColor:  string
  defaultName?:     string
  defaultWhatsapp?: string
  defaultCity?:     string
}

// Beautician CTA → 3-domain-choice popup. Sends to admin (we register
// the .my.id on their behalf). Step 1 = the form, step 2 = success.
//
// Why two steps and no payment screenshot here (unlike the banner flow):
// we collect intent first, then the founder messages them on WhatsApp
// with the QRIS payment + onboarding once they confirm domain
// availability with the registrar. Domain price/availability shifts —
// no point taking money up-front and refunding.
export default function DomainRequestModal({
  open, onClose, themeColor,
  defaultName = '', defaultWhatsapp = '', defaultCity = '',
}: Props) {
  const [step, setStep] = useState<'form'|'done'>('form')
  const [d1, setD1] = useState('')
  const [d2, setD2] = useState('')
  const [d3, setD3] = useState('')
  const [name, setName] = useState(defaultName)
  const [wa,   setWa]   = useState(defaultWhatsapp)
  const [city, setCity] = useState(defaultCity)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStep('form')
      setError(null)
      setName(defaultName)
      setWa(defaultWhatsapp)
      setCity(defaultCity)
    }
  }, [open, defaultName, defaultWhatsapp, defaultCity])

  if (!open) return null

  // Strip the .my.id suffix on display so the user sees just the
  // sub-label they're typing.
  function clean(v: string) {
    return v.trim().toLowerCase().replace(/\.my\.id$/i, '').replace(/[^a-z0-9-]/g, '')
  }

  async function submit() {
    setError(null)
    const c1 = clean(d1)
    if (c1.length < 3) { setError('Domain choice 1 must be at least 3 characters.'); return }
    if (name.trim().length < 2) { setError('Please add your name.'); return }
    if (!/^\+?\d{8,15}$/.test(wa.replace(/\s|-/g, ''))) {
      setError('Please add a valid WhatsApp number.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/beautician/me/request-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_choice_1: c1,
          domain_choice_2: clean(d2) || undefined,
          domain_choice_3: clean(d3) || undefined,
          contact_name:    name.trim(),
          contact_whatsapp: wa.trim(),
          contact_city:    city.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) { setError(j?.error || 'Could not send your request.'); return }
      setStep('done')
    } catch {
      setError('Network error. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full sm:max-w-[440px] bg-[#0F0B16] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'form' && (
          <div className="px-5 pt-6 pb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: themeColor }}
            >
              <Globe2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-white text-[20px] font-extrabold leading-tight">
              Get your own domain name
            </h2>
            <p className="text-white/70 text-[13px] mt-1.5 leading-snug">
              We&apos;ll register a custom domain on your behalf and connect it to your profile. Pricing varies by country — admin will WhatsApp you with availability + a quote.
            </p>

            <div className="mt-4 space-y-3">
              <DomainField
                label="Your top choice"
                value={d1}
                onChange={setD1}
                placeholder="anastasiabeauty"
                themeColor={themeColor}
                required
              />
              <DomainField
                label="Alternative 1 (in case top choice is taken)"
                value={d2}
                onChange={setD2}
                placeholder="anastasia-beauty"
                themeColor={themeColor}
              />
              <DomainField
                label="Alternative 2"
                value={d3}
                onChange={setD3}
                placeholder="anastasiabeauty-bali"
                themeColor={themeColor}
              />
            </div>

            <div className="mt-5 pt-5 border-t border-white/10 space-y-3">
              <p className="text-white/60 text-[11px] uppercase tracking-wider font-bold">
                Your details
              </p>
              <ContactField label="Full name"   value={name} onChange={setName} themeColor={themeColor} />
              <ContactField label="WhatsApp (+62…)" value={wa} onChange={setWa} themeColor={themeColor} inputMode="tel" />
              <ContactField label="City" value={city} onChange={setCity} themeColor={themeColor} />
            </div>

            {error && (
              <p className="mt-3 text-[13px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white font-extrabold text-[14px] shadow-md active:scale-[0.98] transition disabled:opacity-60"
              style={{ background: themeColor }}
            >
              {busy ? 'Sending…' : 'Send request'}
            </button>
            <p className="mt-2 text-white/50 text-[11px] text-center">
              We&apos;ll message you on WhatsApp to confirm availability + payment.
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="px-5 pt-8 pb-6 text-center">
            <div
              className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3"
              style={{ background: themeColor }}
            >
              <Check className="w-7 h-7 text-white" strokeWidth={3} />
            </div>
            <h3 className="text-white text-[18px] font-extrabold">Request sent</h3>
            <p className="text-white/70 text-[13px] mt-1.5 leading-snug">
              We&apos;ll message you on WhatsApp within 1 business day with availability
              and the payment link.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-extrabold text-[13px]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DomainField({
  label, value, onChange, placeholder, themeColor, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  themeColor: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-white/80 text-[12px] font-bold mb-1">
        {label}{required && <span className="text-pink-300"> *</span>}
      </label>
      <div className="flex items-stretch rounded-xl bg-white/5 border border-white/15 overflow-hidden focus-within:border-white/40">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-[14px] px-3 py-3 outline-none placeholder-white/30 min-h-[44px]"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <span
          className="px-3 flex items-center text-white/80 text-[13px] font-bold border-l border-white/10"
          style={{ background: `${themeColor}26` }}
        >
          .my.id
        </span>
      </div>
    </div>
  )
}

function ContactField({
  label, value, onChange, themeColor, inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  themeColor: string
  inputMode?: 'text' | 'tel'
}) {
  return (
    <div>
      <label className="block text-white/70 text-[11px] font-bold mb-1 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full bg-white/5 border border-white/15 rounded-xl text-white text-[14px] px-3 py-3 outline-none min-h-[44px] focus:border-white/40"
        style={{ caretColor: themeColor }}
      />
    </div>
  )
}
