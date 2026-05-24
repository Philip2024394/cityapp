'use client'
import { useEffect } from 'react'

// Fire-and-forget profile-view ping. Each page mount triggers one POST
// to /api/profile-view which inserts a row + bumps visitor_count on the
// matching provider table via DB trigger (mig 0072).
//
// De-duplicated per (provider_type, provider_id) per browser session via
// sessionStorage — same visitor refreshing the page doesn't double-count.
//
// `source` is inferred from document.referrer when not supplied:
//   wa.me / whatsapp.com   → 'wa_share'
//   instagram / tiktok / facebook → 'social'
//   no referrer            → 'qr' (heuristic: QR scans launch in a fresh
//                            tab with no referrer header)
//   otherwise              → 'direct'

type Source = 'direct' | 'wa_share' | 'social' | 'qr'

export function useProfileViewTracker(args: {
  providerType: 'driver' | 'bike_rental' | 'tour_guide' | 'massage' | 'beautician' | 'laundry' | 'handyman' | 'home_clean'
  providerId:   string | null | undefined
  source?:      Source
}) {
  useEffect(() => {
    if (!args.providerId) return
    const key = `cr-view:${args.providerType}:${args.providerId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch { /* private mode — ignore, still ping */ }

    const source = args.source ?? inferSource()
    const anon = readOrMakeAnonId()

    fetch('/api/profile-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        provider_type: args.providerType,
        provider_id:   args.providerId,
        source,
        anon_session_id: anon,
      }),
    }).catch(() => { /* best-effort, never throw */ })
  }, [args.providerType, args.providerId, args.source])
}

function inferSource(): Source {
  if (typeof document === 'undefined') return 'direct'
  const ref = document.referrer || ''
  if (!ref) return 'qr'
  const lower = ref.toLowerCase()
  if (/wa\.me|whatsapp\.com/.test(lower))             return 'wa_share'
  if (/instagram|tiktok|facebook|t\.me|x\.com|twitter/.test(lower)) return 'social'
  return 'direct'
}

function readOrMakeAnonId(): string {
  try {
    let v = localStorage.getItem('cr-anon-id')
    if (!v) {
      v = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('cr-anon-id', v)
    }
    return v
  } catch {
    return 'anon-private'
  }
}
