'use client'
import { useEffect, useState } from 'react'
import { MapPin, Crosshair, Loader2, Check, AlertCircle } from 'lucide-react'
import { useHaptic } from '@/hooks/useHaptic'

// ============================================================================
// LocationPicker — replaces the free-text "Service area" + "City" fields.
//
// Flow:
//   1. Driver taps "Use my location" → browser GPS prompt
//   2. We POST the lat/lng to /api/geo/reverse + /api/geo/admin-lookup
//      in parallel
//   3. UI shows the resolved admin chain (village > district > regency >
//      province) and emits the resolved data via onChange
//
// onChange receives the full payload — parent can persist it to the
// drivers row (lat/lng + admin IDs + display strings).
//
// Manual override: driver can tap "Pick a different spot" to redo. We
// don't ship an embedded map here yet (defer to a follow-up) — GPS +
// reverse-geocode is enough for every legitimate driver who's physically
// in their service area when they sign up.
// ============================================================================

export type LocationPickerValue = {
  lat: number
  lng: number
  province_id: string | null
  regency_id:  string | null
  district_id: string | null
  village_id:  string | null
  province_name: string | null
  regency_name:  string | null
  district_name: string | null
  village_name:  string | null
  area_label: string   // "village, district" or fallback to regency
  city_label: string   // regency or fallback to province
  display_name: string // full human-readable
}

type Props = {
  value?: LocationPickerValue | null
  onChange: (v: LocationPickerValue) => void
}

type Status = 'idle' | 'locating' | 'resolving' | 'ready' | 'error'

export default function LocationPicker({ value, onChange }: Props) {
  const haptic = useHaptic()
  const [status, setStatus] = useState<Status>(value ? 'ready' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<LocationPickerValue | null>(value ?? null)

  useEffect(() => {
    if (value) {
      setResolved(value)
      setStatus('ready')
    }
  }, [value])

  async function pickFromGPS() {
    setError(null)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Location not supported on this device')
      setStatus('error')
      return
    }
    haptic.tap()
    setStatus('locating')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        await resolve(lat, lng)
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — enable it in your browser settings'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'GPS unavailable right now — try again outdoors'
              : err.code === err.TIMEOUT
                ? 'Location timed out — try again'
                : 'Could not get your location'
        setError(msg)
        setStatus('error')
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    )
  }

  async function resolve(lat: number, lng: number) {
    setStatus('resolving')
    try {
      const [revRes, adminRes] = await Promise.all([
        fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`).then((r) => r.json()),
        fetch(`/api/geo/admin-lookup?lat=${lat}&lng=${lng}`).then((r) => r.json()),
      ])
      if (revRes.error || adminRes.error) {
        throw new Error(revRes.error || adminRes.error)
      }
      const v: LocationPickerValue = {
        lat,
        lng,
        province_id: adminRes.province_id ?? null,
        regency_id:  adminRes.regency_id  ?? null,
        district_id: adminRes.district_id ?? null,
        village_id:  adminRes.village_id  ?? null,
        province_name: adminRes.names?.province ?? revRes.province ?? null,
        regency_name:  adminRes.names?.regency  ?? revRes.regency  ?? null,
        district_name: adminRes.names?.district ?? revRes.district ?? null,
        village_name:  adminRes.names?.village  ?? revRes.village  ?? null,
        area_label:    revRes.area_label ?? '',
        city_label:    revRes.city_label ?? '',
        display_name:  revRes.display_name ?? '',
      }
      setResolved(v)
      setStatus('ready')
      haptic.impact()
      onChange(v)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve location')
      setStatus('error')
    }
  }

  // ─── Idle / Error state ─────────────────────────────────────────────
  if (status === 'idle' || status === 'error') {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={pickFromGPS}
          className="w-full p-3.5 rounded-2xl font-extrabold text-[14px] text-bg active:scale-[0.99] transition flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #FACC15, #EAB308)',
            boxShadow: '0 8px 20px rgba(250,204,21,0.30)',
            minHeight: 48,
          }}
        >
          <Crosshair className="w-4 h-4" strokeWidth={2.5} />
          Use my location
        </button>
        {status === 'error' && error && (
          <div
            className="rounded-xl p-3 flex items-start gap-2 text-[12px] leading-relaxed"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <span className="text-ink/90">{error}</span>
          </div>
        )}
        <p className="text-[12px] text-dim leading-relaxed">
          We use your phone&apos;s GPS to set your service area. Your location is only used to
          place you on the marketplace — never shared with anyone.
        </p>
      </div>
    )
  }

  // ─── Locating / Resolving spinner ───────────────────────────────────
  if (status === 'locating' || status === 'resolving') {
    return (
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <Loader2 className="w-5 h-5 text-brand animate-spin" />
        <span className="text-[14px] font-bold text-ink/90">
          {status === 'locating' ? 'Getting your location…' : 'Finding your area in Indonesia…'}
        </span>
      </div>
    )
  }

  // ─── Ready — show resolved admin chain + change button ──────────────
  if (!resolved) return null
  const chain = [
    resolved.village_name,
    resolved.district_name,
    resolved.regency_name,
    resolved.province_name,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-2">
      <div
        className="rounded-2xl p-4 space-y-2"
        style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.30)',
        }}
      >
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" style={{ color: '#22C55E' }} strokeWidth={2.5} />
          <div className="text-[12px] uppercase tracking-wider font-extrabold" style={{ color: '#22C55E' }}>
            Location set
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-brand" />
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-[14px] leading-tight">
              {resolved.area_label || resolved.city_label || 'Unknown area'}
            </div>
            {chain && (
              <div className="text-[12px] text-muted mt-0.5 leading-relaxed">
                {chain}
              </div>
            )}
            <div className="text-[12px] text-dim mt-1 font-mono">
              {resolved.lat.toFixed(5)}, {resolved.lng.toFixed(5)}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={pickFromGPS}
        className="w-full p-2.5 rounded-xl font-bold text-[13px] text-muted active:scale-[0.99] transition flex items-center justify-center gap-2"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          minHeight: 44,
        }}
      >
        <Crosshair className="w-4 h-4" strokeWidth={2.25} />
        Pick a different spot
      </button>

      {/* Honest hint about unmatched admin levels */}
      {(!resolved.village_id || !resolved.district_id) && (
        <p className="text-[12px] text-dim leading-relaxed">
          Note: we matched as much of the area as we could from our Indonesia
          dataset. {resolved.village_id ? '' : 'Village'}
          {!resolved.village_id && !resolved.district_id ? ' + district' : ''}
          {!resolved.village_id ? ' may need manual update if you want full granularity.' : '.'}
        </p>
      )}
    </div>
  )
}
