'use client'
import { useMemo, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'

// Customer-facing booking popup — date + time + service form that
// records a booking_request server-side then bounces the customer to
// WhatsApp with a pre-filled message. Platform never holds money; the
// WA chat stays Standard (not Business) since we never custody payment.
//
// Vertical-agnostic: caller passes serviceOptions, bookEndpoint and
// optional copy overrides. The POST body shape and the busy_dates set
// are identical across verticals so the same component fits beautician,
// handyman, etc.

export type ContactBookingServiceOption = {
  value: string  // sent as service_name in the POST body
  label: string  // shown in the dropdown
}

export type ContactBookingPopupProps = {
  providerSlug:    string
  providerName:    string
  whatsapp:        string
  themeColor:      string
  /** Per-vertical service options. Pass [] to skip the dropdown. */
  serviceOptions:  ContactBookingServiceOption[]
  /** Pre-selected service label (set when triggered from a service card). */
  presetService?:  string
  busyDates:       string[]
  /** API endpoint to POST the booking to. Expected shape:
   *  { customer_name, customer_whatsapp, service_name?, requested_date,
   *    requested_time, notes? } → { ok: true } | { error: string } */
  bookEndpoint:    string
  /** Optional copy overrides. Defaults match the beautician voice. */
  copy?: {
    title?:           string
    intro?:           string
    submitLabel?:     string
    successFooter?:   string
    /** WhatsApp message builder. Defaults to a beautician-flavoured line. */
    whatsappMessage?: (args: { service: string; date: string; time: string; notes: string }) => string
  }
  onClose:         () => void
}

export default function ContactBookingPopup({
  providerSlug, providerName, whatsapp, themeColor,
  serviceOptions, presetService = '', busyDates,
  bookEndpoint, copy, onClose,
}: ContactBookingPopupProps) {
  void providerSlug // referenced via bookEndpoint; kept for symmetry/debugging

  const [name,    setName]    = useState('')
  const [wa,      setWa]      = useState('')
  const [date,    setDate]    = useState('')
  const [time,    setTime]    = useState('')
  const [service, setService] = useState(presetService)
  const [notes,   setNotes]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  const today    = useMemo(() => {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])
  const busySet  = useMemo(() => new Set(busyDates), [busyDates])
  const dateBusy = date.length === 10 && busySet.has(date)

  const timeSuggestions = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30']

  const title         = copy?.title         ?? `Book ${providerName}`
  const intro         = copy?.intro         ?? "Pick a date + time and we'll open WhatsApp with your request."
  const submitLabel   = copy?.submitLabel   ?? 'Send & open WhatsApp'
  const successFooter = copy?.successFooter ?? `We'll log your request so ${providerName} sees the time + service in their calendar.`

  const defaultWaMessage = ({ service: s, date: d, time: t, notes: n }: {
    service: string; date: string; time: string; notes: string
  }) => [
    `Hi ${providerName}, I'd like to book ${s.trim() || 'a service'} `,
    `on ${d} at ${t}.`,
    n.trim() ? `\nNotes: ${n.trim()}` : '',
    `\n\n— Sent via cityriders.id`,
  ].join('')

  async function submit() {
    setErr(null)
    if (name.trim().length < 2) { setErr('Please add your name.'); return }
    const waDigits = wa.replace(/[^\d]/g, '')
    if (waDigits.length < 8 || waDigits.length > 15) {
      setErr('Please add a valid WhatsApp number.')
      return
    }
    if (!date)  { setErr('Pick a date.'); return }
    if (dateBusy) { setErr('That date is unavailable — please pick another.'); return }
    if (!time)  { setErr('Pick a time.'); return }

    setBusy(true)
    try {
      const r = await fetch(bookEndpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          customer_name:     name.trim(),
          customer_whatsapp: wa.startsWith('+') ? wa.trim() : `+${waDigits}`,
          service_name:      service.trim() || undefined,
          requested_date:    date,
          requested_time:    time,
          notes:             notes.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) {
        setErr(j.error === 'rate_limited'
          ? 'Too many requests from this device. Try again tomorrow.'
          : j.error === 'date_unavailable'
            ? 'That date is unavailable — please pick another.'
            : 'Could not submit. Please try again.')
        return
      }

      const builder = copy?.whatsappMessage ?? defaultWaMessage
      const waMsg = builder({ service, date, time, notes })
      window.open(
        `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(waMsg)}`,
        '_blank',
      )
      onClose()
    } catch {
      setErr('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{ borderTop: `4px solid ${themeColor}` }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center z-10"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div className="px-5 pt-6 pb-6 space-y-3.5">
          <div>
            <h2 className="text-[20px] font-black text-black leading-tight">{title}</h2>
            <p className="text-[12px] text-gray-500 mt-1 leading-snug">{intro}</p>
          </div>

          <label className="block space-y-1">
            <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Your name</span>
            <input
              type="text"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah"
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:border-gray-400 min-h-[44px]"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Your WhatsApp</span>
            <input
              type="tel"
              inputMode="numeric"
              value={wa}
              onChange={(e) => setWa(e.target.value)}
              placeholder="+62 812 3456 7890"
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:border-gray-400 min-h-[44px]"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Date</span>
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full rounded-xl border px-3 py-3 text-[14px] text-black focus:outline-none focus:border-gray-400 min-h-[44px] ${
                  dateBusy ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Time</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                list="cr-time-suggestions"
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] text-black focus:outline-none focus:border-gray-400 min-h-[44px]"
              />
              <datalist id="cr-time-suggestions">
                {timeSuggestions.map((t) => <option key={t} value={t} />)}
              </datalist>
            </label>
          </div>
          {dateBusy && (
            <p className="text-[12px] text-red-600 -mt-1">
              {providerName} marked this day busy. Please pick another date.
            </p>
          )}

          {serviceOptions.length > 0 && (
            <label className="block space-y-1">
              <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Service</span>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] text-black bg-white focus:outline-none focus:border-gray-400 min-h-[44px]"
              >
                <option value="">Choose service…</option>
                {serviceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                {presetService && !serviceOptions.some((opt) => opt.value === presetService) && (
                  <option value={presetService}>{presetService}</option>
                )}
              </select>
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Notes (optional)</span>
            <textarea
              maxLength={300}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything they should know…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] text-black placeholder:text-gray-400 focus:outline-none focus:border-gray-400 resize-none"
            />
          </label>

          {err && (
            <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 text-[13px] px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy || dateBusy}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-white font-extrabold text-[14px] shadow-md disabled:opacity-60 active:scale-[0.98] transition"
            style={{ background: themeColor }}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
            {busy ? 'Sending…' : submitLabel}
          </button>
          <p className="text-[10px] text-gray-400 text-center leading-snug">
            {successFooter}
          </p>
        </div>
      </div>
    </div>
  )
}
