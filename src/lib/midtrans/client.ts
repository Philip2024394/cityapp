// ============================================================================
// Midtrans Snap client-side helper
// ----------------------------------------------------------------------------
// Loads the Snap.js SDK on demand (lazy — only when the driver actually
// taps Renew). Determines sandbox vs prod from the public client key
// prefix: 'SB-' means sandbox, anything else is treated as prod.
// ============================================================================

const SANDBOX_SCRIPT = 'https://app.sandbox.midtrans.com/snap/snap.js'
const PROD_SCRIPT    = 'https://app.midtrans.com/snap/snap.js'

let loadPromise: Promise<void> | null = null

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: {
        onSuccess?: (result: unknown) => void
        onPending?: (result: unknown) => void
        onError?:   (result: unknown) => void
        onClose?:   () => void
      }) => void
    }
  }
}

/**
 * Inject the Snap.js script tag once. Returns a promise that resolves
 * when the script has finished loading.
 *
 * Reads NEXT_PUBLIC_MIDTRANS_CLIENT_KEY from build-time env (Next.js).
 * Throws if not configured.
 */
export function loadSnapScript(): Promise<void> {
  if (loadPromise) return loadPromise
  if (typeof window === 'undefined') return Promise.reject(new Error('Server-side'))

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
  if (!clientKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_MIDTRANS_CLIENT_KEY not set'))
  }
  const src = clientKey.startsWith('SB-') ? SANDBOX_SCRIPT : PROD_SCRIPT

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (window.snap) return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Snap.js load failed')))
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.setAttribute('data-client-key', clientKey)
    s.onload  = () => resolve()
    s.onerror = () => reject(new Error('Snap.js load failed'))
    document.head.appendChild(s)
  })
  return loadPromise
}

/**
 * One-shot pay flow:
 *   1. Hit /api/payments/snap/create (creates intent + Snap token)
 *   2. Load Snap.js
 *   3. Open the Snap popup with the returned token
 *
 * Callers pass success/pending/error callbacks (typically: refresh
 * the dashboard, show toast).
 */
export async function startSnapCheckout(opts: {
  product?: 'subscription' | 'subscription_yearly' | 'verified'
  onSuccess?: () => void
  onPending?: () => void
  onError?:   (msg: string) => void
  onClose?:   () => void
}): Promise<void> {
  try {
    // 12s ceiling on the create call — on 3G the round-trip to Snap can
    // hang the "Opening…" button forever without it (audit 2026-05).
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12_000)
    const [createRes] = await Promise.all([
      fetch('/api/payments/snap/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: opts.product ?? 'subscription' }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer)),
      loadSnapScript(),
    ])
    if (!createRes.ok) {
      const json = await createRes.json().catch(() => ({}))
      throw new Error(json?.error || `Create failed (${createRes.status})`)
    }
    const { token } = (await createRes.json()) as { token: string }
    if (!token) throw new Error('Tidak ada Snap token — coba lagi')
    if (!window.snap) throw new Error('Snap belum siap — refresh dan coba lagi')

    window.snap.pay(token, {
      onSuccess: () => opts.onSuccess?.(),
      onPending: () => opts.onPending?.(),
      onError:   (r) => opts.onError?.(typeof r === 'string' ? r : 'Pembayaran gagal'),
      onClose:   () => opts.onClose?.(),
    })
  } catch (e) {
    const isAbort = e instanceof DOMException && e.name === 'AbortError'
    opts.onError?.(
      isAbort
        ? 'Koneksi lambat — Snap tidak merespons. Coba lagi.'
        : e instanceof Error ? e.message : 'Pembayaran gagal',
    )
  }
}
