/**
 * Hourly hire defaults + availability slot definitions.
 *
 * "Hourly hire" = car-driver-by-the-block (3h / 6h / 8h). Petrol is billed
 * separately — the customer pays at SPBU, we never store it. Mocks always
 * render with these defaults; real drivers store their own rates in the
 * drivers table and may reset to these defaults from the dashboard.
 *
 * Numbers sourced from Yogyakarta operator listings (May 2026 retail):
 *   • Avanza / 7-seat MPV — Rp 175k / 300k / 400k  (3h / 6h / 8h, no BBM)
 *   • Innova / premium MPV — Rp 250k / 450k / 600k (3h / 6h / 8h, no BBM)
 *
 * 12h all-in rates we saw in market (Avanza Rp 700k, Innova Rp 900k) include
 * driver meal + petrol; we deliberately offer a slimmer block rate so the
 * customer's all-in cost lands competitive once they refuel themselves.
 */

export type HourlyTier = '3h' | '6h' | '8h'

export type HourlyDefaults = {
  tier_3h: number
  tier_6h: number
  tier_8h: number
}

export const HOURLY_DEFAULTS_AVANZA: HourlyDefaults = {
  tier_3h: 175_000,
  tier_6h: 300_000,
  tier_8h: 400_000,
}

export const HOURLY_DEFAULTS_INNOVA: HourlyDefaults = {
  tier_3h: 250_000,
  tier_6h: 450_000,
  tier_8h: 600_000,
}

/**
 * Look up a sensible default tier-set from vehicle make + model strings.
 * Falls back to Avanza pricing for any 7-seat MPV-ish vehicle, Innova
 * pricing for premium models. Unknown → Avanza defaults (the safer floor).
 */
export function hourlyDefaultsForVehicle(make?: string | null, model?: string | null): HourlyDefaults {
  const m = `${make ?? ''} ${model ?? ''}`.toLowerCase()
  if (m.includes('innova') || m.includes('alphard') || m.includes('fortuner') || m.includes('pajero') || m.includes('hiace')) {
    return HOURLY_DEFAULTS_INNOVA
  }
  // Avanza / Mobilio / Xenia / Ertiga / Confero / Veloz — standard MPV tier.
  return HOURLY_DEFAULTS_AVANZA
}

export function formatIDR(amount: number | null | undefined): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—'
  return `Rp ${amount.toLocaleString('id-ID')}`
}

// ── Availability slots ──────────────────────────────────────────────────────

export type AvailabilitySlotId = 'sunrise' | 'daytime' | 'evening' | 'nightlife'

export type AvailabilitySlot = {
  id: AvailabilitySlotId
  label: string
  windowLabel: string
  emoji: string
  column: 'available_sunrise' | 'available_daytime' | 'available_evening' | 'available_nightlife'
}

export const AVAILABILITY_SLOTS: readonly AvailabilitySlot[] = [
  { id: 'sunrise',   label: 'Sunrise / Airport early', windowLabel: '00:00–07:00', emoji: '🌄', column: 'available_sunrise' },
  { id: 'daytime',   label: 'Daytime',                 windowLabel: '07:00–17:00', emoji: '☀️', column: 'available_daytime' },
  { id: 'evening',   label: 'Evening',                 windowLabel: '17:00–22:00', emoji: '🌇', column: 'available_evening' },
  { id: 'nightlife', label: 'Nightlife / Late hours',  windowLabel: '22:00–04:00', emoji: '🌙', column: 'available_nightlife' },
] as const

/**
 * Petrol policy line used in WhatsApp booking templates for hourly hire.
 * Keep it short — drivers and customers read it on a phone.
 */
export const HOURLY_PETROL_POLICY_ID = 'BBM (bensin) bayar terpisah di SPBU. Driver dan customer dapat foto tangki sebelum & sesudah perjalanan untuk catatan bersama.'
export const HOURLY_PETROL_POLICY_EN = 'Petrol billed separately at the pump. Driver + customer photograph the fuel gauge at pickup and drop-off as a shared record.'

// ── Working-window match check ──────────────────────────────────────────────
// Used by the Hourly booking popup to decide whether a customer's
// (date, startTime, tierHours) request fits inside the driver's
// declared working window. If the driver hasn't set BOTH
// working_hours_start AND working_hours_end, we treat them as
// always-available (don't surface a mismatch CTA).
//
// HH:MM strings are converted to minute counts. When the end <= start
// in minutes, the window wraps midnight (e.g. 18:00 → 02:00). We model
// that by adding 24*60 minutes to the end and (when the start time
// requested is before the window start) to the requested start.

export type HourlyTierDef = { id: HourlyTier; hours: number; label: string }

export const HOURLY_TIERS: ReadonlyArray<HourlyTierDef> = [
  { id: '3h', hours: 3, label: '3-hour block' },
  { id: '6h', hours: 6, label: '6-hour block' },
  { id: '8h', hours: 8, label: '8-hour block' },
] as const

function hhmmToMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm || typeof hhmm !== 'string') return null
  const m = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(hhmm)
  if (!m) return null
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10)
}

/**
 * True when the requested [startTime, startTime + tierHours] interval
 * fits inside the driver's declared working window. When the driver
 * hasn't set their working hours, returns true (no constraint).
 */
export function isHourlyTimeAvailable(args: {
  workingHoursStart: string | null | undefined
  workingHoursEnd:   string | null | undefined
  startTime:         string  // "HH:MM"
  tierHours:         number  // 3, 6, or 8
}): boolean {
  const winStart = hhmmToMinutes(args.workingHoursStart)
  const winEnd   = hhmmToMinutes(args.workingHoursEnd)
  if (winStart == null || winEnd == null) return true  // no constraint set
  const reqStart = hhmmToMinutes(args.startTime)
  if (reqStart == null) return true  // can't parse — be permissive
  const dayMin = 24 * 60
  const wrap = winEnd <= winStart
  const endMin = wrap ? winEnd + dayMin : winEnd
  let s = reqStart
  if (wrap && s < winStart) s += dayMin
  const e = s + args.tierHours * 60
  return s >= winStart && e <= endMin
}
