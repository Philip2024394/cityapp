'use client'
import { Preferences } from '@capacitor/preferences'

// ============================================================================
// Persistent retry queue for driver location pings.
// ----------------------------------------------------------------------------
// Problem we're solving: `locationBridge.ts` used to `fetch().catch(console.warn)`
// — a 5-minute tunnel meant 10 pings hit the floor with zero catch-up,
// so the driver's last-known position on the marketplace drifted by
// kilometres. Audit-flagged P1.
//
// Design:
//   • In-memory FIFO of pending pings, capped at 50. A 25-min outage at
//     a 30s ping cadence = exactly 50 pings; older pings get dropped
//     because position drift is bounded — we'd rather show "5 min ago,
//     near X" than "25 min ago, somewhere".
//   • Every successful POST drains up to 5 queued pings in one batch
//     via POST /api/drivers/location/batch. 5-per-tick keeps a single
//     30s ping from blasting 50 requests in 100ms.
//   • Every failed POST pushes the current ping and waits out an
//     exponential backoff (1s, 2s, 4s, 8s, capped at 30s) before the
//     next attempt is permitted. Reset on first success.
//   • The whole queue is persisted to @capacitor/preferences on every
//     mutation so an app-kill (which DOES happen on Xiaomi/Oppo/Vivo
//     without battery-opt whitelisting — see batteryOptPrompt.ts)
//     doesn't lose pending pings. Restored on bridge startup.
//   • Single-flight: a flag prevents concurrent POSTs piling up if a
//     slow network response and a fresh ping race.
//
// This module is plain TypeScript — no Capacitor-runtime guard — because
// the only Capacitor surface is `Preferences`, which has a working web
// fallback. Safe to import from non-native code paths too.
// ============================================================================

const QUEUE_KEY               = 'cityrider:location_queue_v1'
const MAX_QUEUE_LENGTH        = 50
const BATCH_DRAIN_SIZE        = 5
const LIVE_ENDPOINT           = '/api/drivers/location'
const BATCH_ENDPOINT          = '/api/drivers/location/batch'
const BACKOFF_SCHEDULE_MS     = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000]

export type QueuedPing = {
  lat: number
  lng: number
  capturedAt: number // epoch ms
}

let queue: QueuedPing[] = []
let isFlushing = false
let consecutiveFailures = 0
let nextRetryAllowedAt = 0
let restored = false

async function persist(): Promise<void> {
  try {
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue) })
  } catch {
    /* best-effort — losing a save is better than crashing the bridge */
  }
}

export async function restoreLocationQueue(): Promise<void> {
  if (restored) return
  restored = true
  try {
    const { value } = await Preferences.get({ key: QUEUE_KEY })
    if (!value) return
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return
    queue = parsed.filter(isQueuedPing).slice(-MAX_QUEUE_LENGTH)
  } catch {
    queue = []
  }
}

function isQueuedPing(v: unknown): v is QueuedPing {
  if (!v || typeof v !== 'object') return false
  const p = v as Record<string, unknown>
  return (
    typeof p.lat === 'number' && Number.isFinite(p.lat) &&
    typeof p.lng === 'number' && Number.isFinite(p.lng) &&
    typeof p.capturedAt === 'number' && Number.isFinite(p.capturedAt)
  )
}

function backoffMs(): number {
  const i = Math.min(consecutiveFailures, BACKOFF_SCHEDULE_MS.length) - 1
  if (i < 0) return 0
  return BACKOFF_SCHEDULE_MS[i] ?? BACKOFF_SCHEDULE_MS[BACKOFF_SCHEDULE_MS.length - 1]
}

async function enqueue(ping: QueuedPing): Promise<void> {
  queue.push(ping)
  if (queue.length > MAX_QUEUE_LENGTH) {
    // Drop oldest — bounded drift is preferable to unbounded memory.
    queue.splice(0, queue.length - MAX_QUEUE_LENGTH)
  }
  await persist()
}

async function postLive(ping: QueuedPing): Promise<boolean> {
  try {
    const res = await fetch(LIVE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ lat: ping.lat, lng: ping.lng }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function postBatch(pings: QueuedPing[]): Promise<boolean> {
  try {
    const res = await fetch(BATCH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pings }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Main entry point. Call once per fresh GPS fix from the bridge. Returns
// true on a successful live POST (whether or not the catch-up batch also
// succeeded — the queue stays put on batch failure for the next tick).
export async function sendOrQueueLocationPing(ping: QueuedPing): Promise<boolean> {
  await restoreLocationQueue()

  // Single-flight guard. If a previous flush is still in flight, drop
  // this ping into the queue — the in-flight request will pick it up on
  // its next iteration. The bridge throttles to one ping per 30s so the
  // skipped-fire is harmless.
  if (isFlushing) {
    await enqueue(ping)
    return false
  }

  // Backoff: if we recently failed, just queue silently. Drift cap
  // protects us from queuing forever.
  const now = Date.now()
  if (now < nextRetryAllowedAt) {
    await enqueue(ping)
    return false
  }

  isFlushing = true
  try {
    const liveOk = await postLive(ping)
    if (!liveOk) {
      consecutiveFailures += 1
      nextRetryAllowedAt = Date.now() + backoffMs()
      await enqueue(ping)
      return false
    }

    // Live succeeded — reset backoff and drain.
    consecutiveFailures = 0
    nextRetryAllowedAt = 0

    if (queue.length > 0) {
      const batch = queue.slice(0, BATCH_DRAIN_SIZE)
      const batchOk = await postBatch(batch)
      if (batchOk) {
        queue.splice(0, batch.length)
        await persist()
      }
      // On batch failure we keep the queue intact — the next live ping
      // will retry. We don't bump the failure counter because the live
      // ping itself just succeeded; the batch endpoint may be a
      // transient deploy/race.
    }

    return true
  } finally {
    isFlushing = false
  }
}

// Test/inspection helpers — exported for unit tests + diagnostic UI later.
export function _peekQueueLength(): number { return queue.length }
export function _resetQueueForTests(): void {
  queue = []
  isFlushing = false
  consecutiveFailures = 0
  nextRetryAllowedAt = 0
  restored = false
}
