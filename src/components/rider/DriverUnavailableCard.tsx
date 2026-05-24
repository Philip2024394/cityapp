'use client'
import Link from 'next/link'
import { ArrowRight, Clock, MoonStar, AlertCircle } from 'lucide-react'
import type { Rider, ServiceType } from '@/types/rider'

// ============================================================================
// Driver-unavailable replacement card for /r/[slug].
// ----------------------------------------------------------------------------
// Replaces the booking section (service tiles + pickup/dropoff + Confirm)
// when the driver isn't bookable. Three reasons:
//   • busy        — on an active delivery, will be free soon
//   • offline     — went off-duty, may not return today
//   • lapsed      — subscription past_due / canceled, profile dormant
//
// Single Continue button routes to /cari/rider with the user's already-
// entered trip carried over via query params, so the driver list there
// shows fares + ETAs for the SAME trip without the user re-typing.
// Falls back to /cari (no trip context) when pickup isn't set.
// ============================================================================

type Reason = 'busy' | 'offline' | 'lapsed'

export default function DriverUnavailableCard({
  driverName,
  reason,
  service,
  pickup,
  pickupLabel,
  dropoff,
  dropoffLabel,
  pitstop,
}: {
  driverName: string
  reason: Reason
  service: ServiceType | null
  pickup:       { lat: number; lng: number } | null
  pickupLabel:  string
  dropoff:      { lat: number; lng: number } | null
  dropoffLabel: string
  pitstop:      string
}) {
  const cfg = REASON_CONFIG[reason]
  const continueHref = buildContinueHref({ service, pickup, pickupLabel, dropoff, dropoffLabel, pitstop })

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: cfg.bg,
        border:     `1px solid ${cfg.border}`,
        boxShadow:  '0 18px 40px -20px rgba(0,0,0,0.55)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: cfg.iconBg, border: `1px solid ${cfg.border}` }}
        >
          <cfg.Icon className="w-5 h-5" strokeWidth={2.5} style={{ color: cfg.iconColor }} />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold uppercase tracking-wider" style={{ color: cfg.label }}>
            {cfg.title}
          </div>
          <div className="text-[15px] font-extrabold text-ink mt-1 leading-snug">
            {driverName} {cfg.bodyHeadline}
          </div>
          <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
            {cfg.bodySub}
          </p>
        </div>
      </div>

      <Link
        href={continueHref}
        className="block w-full text-center rounded-xl px-4 py-3 text-[14px] font-extrabold uppercase tracking-wider transition active:scale-95"
        style={{ background: '#FACC15', color: '#0A0A0A', border: '1px solid rgba(0,0,0,0.85)' }}
      >
        <span className="inline-flex items-center gap-2">
          Lihat driver lain
          <ArrowRight className="w-4 h-4" strokeWidth={3} />
        </span>
      </Link>

      <p className="text-[11px] text-muted text-center leading-snug">
        {(pickup && dropoff)
          ? `Trip ${pickupLabel || 'pickup'} → ${dropoffLabel || 'dropoff'} dipertahankan — daftar driver lain langsung muncul dengan harga + ETA untuk trip kamu.`
          : 'Daftar driver lain di kota kamu akan muncul. Atur pickup + dropoff di halaman berikutnya.'}
      </p>
    </div>
  )
}

const REASON_CONFIG = {
  busy: {
    title: 'Currently busy',
    bodyHeadline: 'sedang mengantar pelanggan lain',
    bodySub: 'Driver ini biasanya bebas dalam 15-30 menit. Tunggu, atau pilih driver lain di bawah.',
    Icon: Clock,
    iconColor: '#60A5FA',
    iconBg:    'rgba(96,165,250,0.12)',
    label:     '#60A5FA',
    bg:        'rgba(96,165,250,0.06)',
    border:    'rgba(96,165,250,0.25)',
  },
  offline: {
    title: 'Currently offline',
    bodyHeadline: 'sedang offline',
    bodySub: 'Driver ini belum aktif di marketplace hari ini. Pilih driver lain yang sedang online untuk booking sekarang.',
    Icon: MoonStar,
    iconColor: '#94A3B8',
    iconBg:    'rgba(148,163,184,0.10)',
    label:     '#94A3B8',
    bg:        'rgba(148,163,184,0.05)',
    border:    'rgba(148,163,184,0.20)',
  },
  lapsed: {
    title: 'Profile inactive',
    bodyHeadline: 'tidak menerima booking saat ini',
    bodySub: 'Subscription driver belum diperpanjang. Pilih driver lain yang aktif untuk booking sekarang.',
    Icon: AlertCircle,
    iconColor: '#FCA5A5',
    iconBg:    'rgba(239,68,68,0.10)',
    label:     '#FCA5A5',
    bg:        'rgba(239,68,68,0.06)',
    border:    'rgba(239,68,68,0.25)',
  },
} as const

function buildContinueHref(args: {
  service: ServiceType | null
  pickup:       { lat: number; lng: number } | null
  pickupLabel:  string
  dropoff:      { lat: number; lng: number } | null
  dropoffLabel: string
  pitstop:      string
}): string {
  const p  = new URLSearchParams()
  const sv = args.service ?? 'person'
  p.set('service', sv)

  if (args.pickup) {
    p.set('pLat',  String(args.pickup.lat))
    p.set('pLng',  String(args.pickup.lng))
    if (args.pickupLabel)  p.set('pName', args.pickupLabel)
  }
  if (args.dropoff) {
    p.set('dLat',  String(args.dropoff.lat))
    p.set('dLng',  String(args.dropoff.lng))
    if (args.dropoffLabel) p.set('dName', args.dropoffLabel)
  }
  if (args.pitstop && args.pitstop.trim()) {
    p.set('pitstop', args.pitstop.trim())
  }

  // Both ends set → go straight to the driver list with the trip ticket
  // pre-filled. Either end missing → go to /cari first so the user
  // completes the trip details.
  if (args.pickup && args.dropoff) return `/cari/rider?${p.toString()}`
  return `/cari?${p.toString()}`
}
