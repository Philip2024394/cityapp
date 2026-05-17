'use client'
import { useEffect, useRef } from 'react'

// Cross-tab order coordination via BroadcastChannel (zero-server,
// works in dev today). Swap for Supabase Realtime channel later
// without touching consumer components — same OrderEvent shape.
//
//   Tab 1 (customer) broadcasts { type: 'created', order }
//   Tab 2 (driver dashboard) receives → opens modal
//   Tab 2 broadcasts { type: 'accepted', orderId, riderName }
//   Tab 1 receives → updates waiting view to "accepted"

const CHANNEL_NAME = 'cityrider:orders'

export type IncomingOrderPayload = {
  id: string
  customerSession: string         // anon cookie identifier (here: random)
  riderId: string                 // recipient rider
  riderName: string
  pickupLabel: string
  dropoffLabel: string
  pitstopNote?: string
  distanceKm: number
  fare: number
  pitstopFee?: number
  createdAt: number
}

export type OrderEvent =
  | { type: 'created';  order: IncomingOrderPayload }
  | { type: 'accepted'; orderId: string; riderId: string; riderName: string; acceptedAt: number }
  | { type: 'declined'; orderId: string; riderId: string }
  | { type: 'expired';  orderId: string }

export function useOrderChannel(onEvent?: (e: OrderEvent) => void) {
  const chRef = useRef<BroadcastChannel | null>(null)
  const handlerRef = useRef(onEvent)
  // Keep handler ref up-to-date without re-creating the channel
  useEffect(() => { handlerRef.current = onEvent }, [onEvent])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof BroadcastChannel === 'undefined') return  // very old browsers

    const ch = new BroadcastChannel(CHANNEL_NAME)
    chRef.current = ch
    ch.onmessage = (msg) => { try { handlerRef.current?.(msg.data as OrderEvent) } catch {} }
    return () => { ch.close(); chRef.current = null }
  }, [])

  return {
    broadcast(e: OrderEvent) {
      try { chRef.current?.postMessage(e) } catch {}
    },
  }
}

// Helper: generate a stable per-tab session id for customer events.
// Lives in localStorage so the same tab keeps its identity across refreshes.
export function getCustomerSessionId(): string {
  if (typeof window === 'undefined') return 'srv'
  try {
    const k = 'cr_cust_session'
    let s = localStorage.getItem(k)
    if (!s) { s = 'c_' + Math.random().toString(36).slice(2, 10); localStorage.setItem(k, s) }
    return s
  } catch { return 'c_anon' }
}
