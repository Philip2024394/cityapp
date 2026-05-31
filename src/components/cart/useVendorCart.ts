'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// =============================================================================
// useVendorCart — vendor-agnostic generalization of usePlaceCart.
//
// Founder direction: every priced vertical (food, beautician, handyman,
// laundry, massage, home-clean, tour-guide) needs the same "add items to
// a cart, review, hand off to checkout (WhatsApp or paid)" flow. Rather
// than re-implement per surface, this hook lifts the same defensive
// localStorage-backed state machine into one place, keyed by a composite
// `vendorKey` so a customer can carry a Gudeg cart at Warung A and a
// haircut cart at Salon B without one stomping the other — even across
// verticals.
//
// `vendorKey` convention: `${vendorType}:${vendorId}`. The hook does NOT
// parse the key — it's used verbatim as the storage suffix. Storage is
// localStorage only, no auth, no server, no cookies.
//
// All defensive parsing from the place variant is preserved (try/catch,
// per-field validation, silent-drop of malformed entries). Auto-clear on
// tab hide / unmount is the responsibility of the parent (same UX pattern
// as PlaceProfileShell), but the API exposes `clear()` for that purpose.
// =============================================================================

const STORAGE_PREFIX = 'citydrivers:cart:vendor:'

export type VendorCartOffer = {
  offer_id:  string
  name:      string
  price_idr: number
  image_url: string | null
}

export type VendorCartItem = VendorCartOffer & { qty: number }

export type VendorCartApi = {
  items:    VendorCartItem[]
  totalIdr: number
  totalQty: number
  add(offer: VendorCartOffer, qty: number): void
  setQty(offer_id: string, qty: number): void
  remove(offer_id: string): void
  clear(): void
}

function storageKey(vendorKey: string): string {
  return `${STORAGE_PREFIX}${vendorKey}`
}

// Runtime guard — defensive read against a stale or hand-edited blob.
// We don't trust the shape, so we validate each entry field-by-field
// and silently drop anything that doesn't fit. Better empty cart than
// a crash on mount.
function parseStoredItems(raw: string | null): VendorCartItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const items: VendorCartItem[] = []
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as Record<string, unknown>
      const offer_id  = typeof e.offer_id  === 'string' ? e.offer_id  : null
      const name      = typeof e.name      === 'string' ? e.name      : null
      const price_idr = typeof e.price_idr === 'number' && e.price_idr > 0 ? e.price_idr : null
      const image_url = typeof e.image_url === 'string' ? e.image_url : null
      const qty       = typeof e.qty       === 'number' && e.qty > 0 ? Math.floor(e.qty) : null
      if (!offer_id || !name || price_idr == null || qty == null) continue
      items.push({ offer_id, name, price_idr, image_url, qty })
    }
    return items
  } catch {
    return []
  }
}

export function useVendorCart(vendorKey: string): VendorCartApi {
  const [items, setItems] = useState<VendorCartItem[]>([])
  // Mount-flush guard — we skip the very first persist effect run because
  // it would overwrite a fresh localStorage read with the initial empty
  // state before the read has a chance to land.
  const hydrated = useRef(false)

  // Defensive read on mount. SSR-safe — window check first.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey(vendorKey))
      setItems(parseStoredItems(raw))
    } catch {
      setItems([])
    }
    hydrated.current = true
  }, [vendorKey])

  // Auto-persist on every change. Skips the pre-hydration tick so we
  // don't blow away the stored cart with `[]`.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hydrated.current) return
    try {
      if (items.length === 0) {
        window.localStorage.removeItem(storageKey(vendorKey))
      } else {
        window.localStorage.setItem(storageKey(vendorKey), JSON.stringify(items))
      }
    } catch {
      /* quota / private mode — silently ignore */
    }
  }, [items, vendorKey])

  const add = useCallback((offer: VendorCartOffer, qty: number) => {
    if (!offer.offer_id || qty <= 0) return
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.offer_id === offer.offer_id)
      if (idx === -1) {
        return [...prev, { ...offer, qty: Math.floor(qty) }]
      }
      const next = prev.slice()
      next[idx] = { ...next[idx], qty: next[idx].qty + Math.floor(qty) }
      return next
    })
  }, [])

  const setQty = useCallback((offer_id: string, qty: number) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.offer_id === offer_id)
      if (idx === -1) return prev
      // qty <= 0 removes the line entirely — matches the spec for the
      // stepper hitting 0 in the cart sheet.
      if (qty <= 0) {
        const next = prev.slice()
        next.splice(idx, 1)
        return next
      }
      const next = prev.slice()
      next[idx] = { ...next[idx], qty: Math.floor(qty) }
      return next
    })
  }, [])

  const remove = useCallback((offer_id: string) => {
    setItems((prev) => prev.filter((it) => it.offer_id !== offer_id))
  }, [])

  const clear = useCallback(() => {
    setItems([])
  }, [])

  const totals = useMemo(() => {
    let totalIdr = 0
    let totalQty = 0
    for (const it of items) {
      totalIdr += it.price_idr * it.qty
      totalQty += it.qty
    }
    return { totalIdr, totalQty }
  }, [items])

  return {
    items,
    totalIdr: totals.totalIdr,
    totalQty: totals.totalQty,
    add,
    setQty,
    remove,
    clear,
  }
}
