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
    const utm = readUtm()

    fetch('/api/profile-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        provider_type: args.providerType,
        provider_id:   args.providerId,
        source,
        anon_session_id: anon,
        ...utm,
      }),
    }).catch(() => { /* best-effort, never throw */ })
  }, [args.providerType, args.providerId, args.source])
}

// Read utm_* params from the visitor URL. Captured at view time so a deep
// link like /r/budi?utm_source=instagram&utm_campaign=lebaran-2026 lands
// attributed correctly. Values capped at 100 chars to defend against
// pathological URLs.
function readUtm(): {
  utm_source:   string | null
  utm_medium:   string | null
  utm_campaign: string | null
  utm_content:  string | null
  utm_term:     string | null
} {
  const out = {
    utm_source:   null as string | null,
    utm_medium:   null as string | null,
    utm_campaign: null as string | null,
    utm_content:  null as string | null,
    utm_term:     null as string | null,
  }
  if (typeof window === 'undefined') return out
  try {
    const p = new URLSearchParams(window.location.search)
    const grab = (k: string) => {
      const v = p.get(k)
      return v ? v.slice(0, 100) : null
    }
    out.utm_source   = grab('utm_source')
    out.utm_medium   = grab('utm_medium')
    out.utm_campaign = grab('utm_campaign')
    out.utm_content  = grab('utm_content')
    out.utm_term     = grab('utm_term')
  } catch { /* swallow */ }
  return out
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
