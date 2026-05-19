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
// The active booking and the "already tried" history both live under the
// same key so a single read on the pending screen surfaces everything.
// ============================================================================

import type { ServiceType } from '@/types/rider'

const STORAGE_KEY = 'cityrider_pending_booking'
const SCHEMA_VERSION = 1
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
  trip: PendingBookingTrip
  sentAtMs: number
  /** Driver IDs already contacted in this session — drives the "Tried"
   *  pill on the marketplace and excludes them from "alternative drivers"
   *  shown on the pending screen. */
  triedDriverIds: string[]
}

export function readPendingBooking(): PendingBooking | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingBooking>
    if (!parsed?.driverId || typeof parsed.sentAtMs !== 'number') return null
    if (parsed.v !== SCHEMA_VERSION) return null
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
 *  including the currently active one. Used to dim/pill those drivers on
 *  the marketplace list when the customer comes back. */
export function readTriedDriverIds(): string[] {
  const cur = readPendingBooking()
  if (!cur) return []
  return Array.from(new Set([...cur.triedDriverIds, cur.driverId]))
}

/** Returns true if `driverId` is the active pending booking. */
export function isCurrentPendingDriver(driverId: string): boolean {
  return readPendingBooking()?.driverId === driverId
}
