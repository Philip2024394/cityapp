'use client'
import { useMemo, useState } from 'react'
import { CalendarDays, MessageCircle, X as XIcon } from 'lucide-react'
import {
  formatIDR,
  HOURLY_PETROL_POLICY_ID,
  HOURLY_PETROL_POLICY_EN,
  HOURLY_TIERS,
  isHourlyTimeAvailable,
  type HourlyTier,
} from '@/lib/pricing/hourlyHire'
import { fireConnectIntent } from '@/lib/connectIntent'

// =============================================================================
// HourlyBookingPopup — shared date + time picker for the Hourly hire flow
// (car / bike / truck profile pages). Submits via WhatsApp deep-link with the
// hourly-template body. When the requested (start, start+tier) interval
// doesn't fit the driver's declared working window, swaps the CTA for
// "Check other drivers" which diverts to /cari filtered by hourly params.
// =============================================================================

const BRAND_YELLOW = '#FACC15'
const TEXT_INK     = '#0A0A0A'

export type HourlyBookingDriver = {
  id:                  string
  business_name:       string
  whatsapp_e164:       string | null
  vehicle_type:        string | null
  working_hours_start?: string | null
  working_hours_end?:   string | null
}

export default function HourlyBookingPopup({
  driver, tier, amount, label, onClose,
}: {
  driver:  HourlyBookingDriver
  tier:    HourlyTier
  amount:  number
  label:   string
  onClose: () => void
}) {
  const tierHours = HOURLY_TIERS.find((t) => t.id === tier)?.hours ?? 3
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [err,  setErr]  = useState<string | null>(null)

  const today = useMemo(() => {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])

  const fitsWindow = useMemo(() => {
    if (!time) return true
    return isHourlyTimeAvailable({
      workingHoursStart: driver.working_hours_start ?? null,
      workingHoursEnd:   driver.working_hours_end ?? null,
      startTime:         time,
      tierHours,
    })
  }, [driver.working_hours_start, driver.working_hours_end, time, tierHours])

  function submitWhatsApp() {
    setErr(null)
    if (!date) { setErr('Pick a date.'); return }
    if (!time) { setErr('Pick a time.'); return }
    const waDigits = (driver.whatsapp_e164 ?? '').replace(/\D+/g, '')
    if (!waDigits) { setErr('Driver WhatsApp not available.'); return }

    const body = [
      `Halo ${driver.business_name},`,
      '',
      `Saya ingin booking hourly hire dengan paket ${label} (${formatIDR(amount)}).`,
      `Tanggal: ${date}`,
      `Mulai jam: ${time}`,
      '',
      `Catatan BBM: ${HOURLY_PETROL_POLICY_ID}`,
      '',
      'Lokasi pickup: (akan saya kirim setelah konfirmasi)',
      '',
      'Terima kasih!',
    ].join('\n')

    const source = driver.vehicle_type === 'bike' ? 'rider_profile' : 'car_profile'
    fireConnectIntent(driver.id, source, driver.vehicle_type === 'bike' ? 'rider' : 'car')
    window.open(`https://wa.me/${waDigits}?text=${encodeURIComponent(body)}`, '_blank')
    onClose()
  }

  function checkOtherDrivers() {
    setErr(null)
    if (!date) { setErr('Pick a date.'); return }
    if (!time) { setErr('Pick a time.'); return }
    const service = driver.vehicle_type === 'bike' ? 'bike' : 'car'
    const sp = new URLSearchParams()
    sp.set('service', service)
    sp.set('hourlyTier', tier)
    sp.set('hourlyDate', date)
    sp.set('hourlyTime', time)
    window.location.assign(`/cari?${sp.toString()}`)
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
        style={{ borderTop: `4px solid ${BRAND_YELLOW}` }}
      >
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <span
            aria-hidden
            className="w-9 h-9 rounded-full inline-flex items-center justify-center"
            style={{
              background: BRAND_YELLOW,
              color: TEXT_INK,
              boxShadow: '0 4px 12px rgba(250,204,21,0.45)',
            }}
          >
            <CalendarDays className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
          >
            <XIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-5 pt-6 pb-6 space-y-3.5">
          <div className="border-b border-gray-100 pb-3 pr-24">
            <div className="text-[10.5px] font-extrabold uppercase tracking-[0.15em]" style={{ color: '#854D0E' }}>
              Hourly hire
            </div>
            <h2 className="text-[18px] font-black text-black leading-tight mt-0.5">
              {label} · {formatIDR(amount)}
            </h2>
          </div>
          <p className="text-[12px] text-gray-500 leading-snug">
            Pick a date + start time. We&apos;ll open WhatsApp with your request and the BBM policy.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Date</span>
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] focus:outline-none focus:border-gray-400 min-h-[44px]"
                style={{ background: '#FFFFFF', color: '#0A0A0A', colorScheme: 'light' }}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-extrabold text-gray-700 uppercase tracking-wider">Start time</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[14px] focus:outline-none focus:border-gray-400 min-h-[44px]"
                style={{ background: '#FFFFFF', color: '#0A0A0A', colorScheme: 'light' }}
              />
            </label>
          </div>

          <p className="text-[12px] leading-snug text-gray-500">
            {HOURLY_PETROL_POLICY_EN}
          </p>

          {err && (
            <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 text-[13px] px-3 py-2">
              {err}
            </div>
          )}

          {fitsWindow ? (
            <button
              type="button"
              onClick={submitWhatsApp}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-extrabold text-[14px] shadow-md active:scale-[0.98] transition"
              style={{ background: BRAND_YELLOW, color: TEXT_INK, minHeight: 48 }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
              Open WhatsApp with request
            </button>
          ) : (
            <div className="space-y-2">
              <div className="rounded-xl border text-[12px] px-3 py-2 leading-snug" style={{
                background: '#FEF3C7', borderColor: '#FDE68A', color: '#854D0E',
              }}>
                These times are outside {driver.business_name.split(' ')[0]}&apos;s
                working window ({driver.working_hours_start} – {driver.working_hours_end}).
              </div>
              <button
                type="button"
                onClick={checkOtherDrivers}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-extrabold text-[14px] shadow-md active:scale-[0.98] transition"
                style={{ background: TEXT_INK, color: BRAND_YELLOW, minHeight: 48 }}
              >
                Check other drivers
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
