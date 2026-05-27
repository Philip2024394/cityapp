'use client'
// ============================================================================
// RentalSection — shared "Rental rates · Self-published" section
// ----------------------------------------------------------------------------
// Used by /dashboard/truck, /dashboard/car, /dashboard/bus. Writes to the
// drivers.rental_type / rental_daily_rate_idr / rental_weekly_rate_idr /
// rental_monthly_rate_idr / rental_min_days columns (migration 0097).
//
// IndoCity is a SOFTWARE DIRECTORY under PM 12/2019. Rental rates are
// self-published — the driver sets every value. IndoCity displays them
// as-is, never sets or modifies driver prices, and never computes fares.
//
// The component owns local "draft" state for the inputs and calls onSave
// with the final payload. The parent dashboard page owns the supabase
// update (and any reload/toast wiring) — this keeps the component pure
// w.r.t. the data layer.
//
// The toggle controls whether rental fields are SUBMITTED. When toggled
// off, saving the section nulls rental_type + rental_daily_rate_idr +
// weekly + monthly (i.e. the driver opts out of the rental marketplace).
// rental_min_days has a NOT NULL DEFAULT 1 at the DB level, so we always
// send a value (defaulted to 1 in the UI).
// ============================================================================
import { useState } from 'react'

export type RentalType = 'self_drive' | 'with_driver' | 'both'

export type RentalSavePayload = {
  rental_type: RentalType | null
  rental_daily_rate_idr: number | null
  rental_weekly_rate_idr: number | null
  rental_monthly_rate_idr: number | null
  rental_min_days: number
}

export type RentalSectionProps = {
  // Current persisted values from the drivers row.
  rentalType: RentalType | null
  rentalDailyRateIdr: number | null
  rentalWeeklyRateIdr: number | null
  rentalMonthlyRateIdr: number | null
  rentalMinDays: number | null
  // Default rental_type used when the driver enables the toggle for the
  // first time (no rental_type on the row yet). Truck → 'with_driver',
  // car → 'both', bus → 'with_driver'.
  defaultRentalType?: RentalType
  // Vehicle word used in copy ("Offer my <vehicle> for daily rental").
  vehicleNoun?: string
  // Save callback — parent owns the Supabase write. Should resolve when
  // the network round-trip completes (success or failure). Return value
  // is ignored but kept as a Promise for ergonomic awaits.
  onSave: (payload: RentalSavePayload) => Promise<unknown>
  // Optional saving/toast plumbing from the parent's section saver hook.
  // The parent already has these patterns — we just reuse them so the
  // toast UX matches every other section card on the dashboard.
  saving?: boolean
  toast?: { kind: 'ok' | 'err'; msg: string } | null
}

// ----------------------------------------------------------------------------
// Tailwind class strings — match the other dashboard section cards.
// 13px text floor, 44px tap targets, brand-yellow save button, rounded-2xl
// white card with soft shadow. See feedback_streetlocal_text_size memory.
// ----------------------------------------------------------------------------
const inputCls =
  'w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-[14px] text-black placeholder:text-black/40 focus:outline-none focus:border-brand min-h-[44px]'

const labelCls = 'block'
const labelTextCls = 'text-[13px] font-bold text-black/70 mb-1 inline-block'

export default function RentalSection({
  rentalType,
  rentalDailyRateIdr,
  rentalWeeklyRateIdr,
  rentalMonthlyRateIdr,
  rentalMinDays,
  defaultRentalType = 'with_driver',
  vehicleNoun = 'vehicle',
  onSave,
  saving = false,
  toast = null,
}: RentalSectionProps) {
  // The toggle is "enabled" when the driver has any rental_type set on
  // the server. If the row arrives with rental_type=null we start in
  // disabled mode but still seed the inputs from any stale numeric
  // values so the driver doesn't lose data if they flip the toggle on
  // accidentally.
  const initialEnabled = rentalType != null
  const [enabled, setEnabled] = useState<boolean>(initialEnabled)
  const [rType, setRType] = useState<RentalType>(rentalType ?? defaultRentalType)
  const [daily, setDaily] = useState<string>(
    rentalDailyRateIdr != null ? String(rentalDailyRateIdr) : '',
  )
  const [weekly, setWeekly] = useState<string>(
    rentalWeeklyRateIdr != null ? String(rentalWeeklyRateIdr) : '',
  )
  const [monthly, setMonthly] = useState<string>(
    rentalMonthlyRateIdr != null ? String(rentalMonthlyRateIdr) : '',
  )
  const [minDays, setMinDays] = useState<string>(
    rentalMinDays != null ? String(rentalMinDays) : '1',
  )

  // Dirty detection. We compare the FINAL payload that would be submitted
  // against the current row values — so flipping the toggle off counts as
  // dirty (because the patch will null all fields).
  const initialDaily = rentalDailyRateIdr != null ? String(rentalDailyRateIdr) : ''
  const initialWeekly = rentalWeeklyRateIdr != null ? String(rentalWeeklyRateIdr) : ''
  const initialMonthly = rentalMonthlyRateIdr != null ? String(rentalMonthlyRateIdr) : ''
  const initialMinDays = rentalMinDays != null ? String(rentalMinDays) : '1'

  const dirty =
    enabled !== initialEnabled ||
    (enabled &&
      (rType !== (rentalType ?? defaultRentalType) ||
        daily !== initialDaily ||
        weekly !== initialWeekly ||
        monthly !== initialMonthly ||
        minDays !== initialMinDays))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!enabled) {
      // Opt out — null all rental columns, but keep min_days at 1
      // (NOT NULL DEFAULT at the DB level).
      await onSave({
        rental_type: null,
        rental_daily_rate_idr: null,
        rental_weekly_rate_idr: null,
        rental_monthly_rate_idr: null,
        rental_min_days: 1,
      })
      return
    }
    await onSave({
      rental_type: rType,
      rental_daily_rate_idr: daily === '' ? null : Number(daily),
      rental_weekly_rate_idr: weekly === '' ? null : Number(weekly),
      rental_monthly_rate_idr: monthly === '' ? null : Number(monthly),
      rental_min_days: minDays === '' ? 1 : Math.max(1, Number(minDays)),
    })
  }

  const toastCls =
    toast?.kind === 'ok'
      ? 'border-green-300 bg-green-50 text-green-800'
      : 'border-red-300 bg-red-50 text-red-800'

  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
      <h2 className="text-[14px] font-extrabold uppercase tracking-wider">
        Your rental rates · Self-published
      </h2>
      <p className="text-[13px] text-black/70 leading-snug">
        IndoCity displays them as-is — we never set or modify driver prices.
        Customers agree the rental terms directly with you.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-brand w-5 h-5"
          />
          <span className="text-[14px] font-bold text-black/85">
            Offer my {vehicleNoun} for daily rental
          </span>
        </label>

        {enabled && (
          <div className="space-y-3 rounded-xl bg-yellow-50/40 border border-yellow-200 p-3">
            <label className={labelCls}>
              <span className={labelTextCls}>Rental type</span>
              <select
                className={inputCls}
                value={rType}
                onChange={(e) => setRType(e.target.value as RentalType)}
              >
                <option value="with_driver">With driver (sopir included)</option>
                <option value="self_drive">Self-drive (lepas kunci)</option>
                <option value="both">Both</option>
              </select>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className={labelCls}>
                <span className={labelTextCls}>Daily rate (Rp)</span>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                  placeholder="600000"
                />
              </label>
              <label className={labelCls}>
                <span className={labelTextCls}>Weekly rate (Rp) — optional</span>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={weekly}
                  onChange={(e) => setWeekly(e.target.value)}
                  placeholder="3500000"
                />
              </label>
              <label className={labelCls}>
                <span className={labelTextCls}>Monthly rate (Rp) — optional</span>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                  placeholder="12000000"
                />
              </label>
            </div>
            <label className={labelCls}>
              <span className={labelTextCls}>Minimum rental (days)</span>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={minDays}
                onChange={(e) => setMinDays(e.target.value)}
                placeholder="1"
              />
            </label>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {toast ? (
            <div className={`rounded-lg border ${toastCls} text-[13px] px-3 py-2`}>
              {toast.msg}
            </div>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={saving || !dirty}
            className="rounded-full bg-brand text-bg px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider min-h-[44px] disabled:opacity-60"
          >
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </form>
    </section>
  )
}
