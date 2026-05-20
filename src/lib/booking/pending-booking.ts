'use client'
// ============================================================================
// Pending-booking client state.
// ----------------------------------------------------------------------------
// Lives ONLY in sessionStorage on the customer's browser. We do not write
// anything to the database when a customer taps Book → opens WhatsApp.
// That's the load-bearing decision behind cityrider's directory posture
// (PM 12/2019): the platform is not the recorder of trip-bound state.
//
// Purpose of this module: give the customer a polished "waiting for the
// driver" UX while the actual conversation happens on WhatsApp. Pure UX,
// zero operator behaviour.
//
// The active booking, the parallel attempts (when the customer asks a
// backup driver alongside the primary), and the "already tried" history
// all live under the same key so a single read on the pending screen
// surfaces everything.
// ============================================================================

import type { ServiceType } from '@/types/rider'

const STORAGE_KEY = 'cityrider_pending_booking'
const SCHEMA_VERSION = 2
// Booking entries older than this are dropped on read — covers the case
// where a customer leaves a tab open for hours/days and comes back.
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export type PendingBookingTrip = {
  pickup: { lat: number; lng: number; label: string }
  dropoff: { lat: number; lng: number; label: string }
  distanceKm: number
  fare: number
  pricePerKm: number
  etaMin: number
  service: ServiceType | null
  pitstop?: { note: string; fee: number } | null
}

/** A parallel attempt — the customer messaged a backup driver alongside
 *  the primary, hasn't replaced the primary, and is waiting to see who
 *  replies first. Each has its own elapsed timer on the pending screen. */
export type ParallelAttempt = {
  driverId: string
  driverSlug: string
  driverName: string
  driverPhotoUrl: string
  driverWhatsAppE164: string
  driverWhatsAppLink: string
  sentAtMs: number
}

export type PendingBooking = {
  v: typeof SCHEMA_VERSION
  driverId: string
  driverSlug: string
  driverName: string
  driverPhotoUrl: string
  driverWhatsAppE164: string
  /** Full wa.me URL — exact same link the user originally tapped, so
   *  "Open WhatsApp again" returns to the same conversation with no new
   *  message generated. */
  driverWhatsAppLink: string
  /** ISO timestamp of the driver's last server-side activity at the
   *  moment we recorded the booking. Used to render "Active 3m ago" on
   *  the pending hero without re-fetching. */
  driverLastSeenAt: string | null
  /** ISO timestamp of when the driver went online for this session.
   *  Used to render "Online 2h" on the pending hero. */
  driverSessionStartedAt: string | null
  trip: PendingBookingTrip
  sentAtMs: number
  /** Driver IDs already contacted in this session — drives the "Tried"
   *  pill on the marketplace and excludes them from "alternative drivers"
   *  shown on the pending screen. */
  triedDriverIds: string[]
  /** Backup drivers messaged alongside the primary. The customer chose
   *  "Message both" instead of "Replace" on an alternative — we keep
   *  both conversations live until they confirm which one replied. */
  parallelAttempts: ParallelAttempt[]
}

export function readPendingBooking(): PendingBooking | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingBooking>
    if (!parsed?.driverId || typeof parsed.sentAtMs !== 'number') return null
    // Drop pre-v2 records — schema added driverLastSeenAt / parallelAttempts
    // and we don't carry old shapes forward.
    if (parsed.v !== SCHEMA_VERSION) {
      clearPendingBooking()
      return null
    }
    if (Date.now() - parsed.sentAtMs > MAX_AGE_MS) {
      clearPendingBooking()
      return null
    }
    return parsed as PendingBooking
  } catch {
    return null
  }
}

export function writePendingBooking(b: Omit<PendingBooking, 'v'>): PendingBooking {
  const full: PendingBooking = { v: SCHEMA_VERSION, ...b }
  if (typeof window === 'undefined') return full
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full))
  } catch {
    /* sessionStorage full / disabled — UX degrades to "no pending screen"
       but the WhatsApp link still works, so nothing is broken. */
  }
  return full
}

export function clearPendingBooking(): void {
  if (typeof window === 'undefined') return
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

/** Returns the list of driver IDs the customer has tried in this session,
 *  including the currently active one + any parallel attempts. Used to
 *  dim/pill those drivers on the marketplace list when the customer
 *  comes back. */
export function readTriedDriverIds(): string[] {
  const cur = readPendingBooking()
  if (!cur) return []
  const parallelIds = cur.parallelAttempts.map((a) => a.driverId)
  return Array.from(new Set([...cur.triedDriverIds, ...parallelIds, cur.driverId]))
}

/** Returns true if `driverId` is the active pending booking. */
export function isCurrentPendingDriver(driverId: string): boolean {
  return readPendingBooking()?.driverId === driverId
}
