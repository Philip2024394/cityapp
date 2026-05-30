'use client'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { haversineKm } from '@/lib/geo/haversine'
import { idr } from '@/lib/format/idr'
import { getBikeImageUrl } from '@/data/bikeImages'
import { getCarImageUrl } from '@/data/carImages'
import type { DriverPublic } from '../DriverProfileShell'

const TEXT_INK    = '#0A0A0A'
const TEXT_MUTED  = '#71717A'
const BORDER      = '#E4E4E7'
const INPUT_BG    = '#F4F4F5'

// Single alternative-driver card. Tap routes to THAT driver's profile —
// /r/{slug} for bike, /car/{slug} for car/truck/minibus. The BOOK NOW
// WhatsApp deep-link lives on the profile itself, so customers see trust
// signals (photo, vehicle, rating, reviews) BEFORE committing to chat.
export default function AlternativeRow({
  alt, anchorLat, anchorLng,
}: {
  alt:        DriverPublic
  anchorLat:  number | null
  anchorLng:  number | null
}) {
  const hasDistance =
    typeof anchorLat === 'number' && typeof anchorLng === 'number' &&
    typeof alt.lat   === 'number' && typeof alt.lng   === 'number' &&
    (anchorLat !== 0 || anchorLng !== 0) && (alt.lat !== 0 || alt.lng !== 0)
  const distanceKm = hasDistance
    ? haversineKm({ lat: anchorLat!, lng: anchorLng! }, { lat: alt.lat!, lng: alt.lng! })
    : null

  const showRate = alt.min_fee != null && alt.price_per_km != null

  const isCarLike = alt.vehicle_type === 'car'
                 || alt.vehicle_type === 'truck'
                 || alt.vehicle_type === 'minibus'
                 || alt.vehicle_type === 'premium_car'
  const profileHref = isCarLike ? `/car/${alt.slug}` : `/r/${alt.slug}`

  // Stock vehicle photo (not driver headshot) so alt cards match the
  // main showcase quality.
  const altShowcasePhoto = alt.vehicle_type === 'bike'
    ? getBikeImageUrl(alt.vehicle_make, alt.vehicle_model)
    : getCarImageUrl(alt.vehicle_make, alt.vehicle_model)

  return (
    <li>
      <Link
        href={profileHref}
        prefetch
        aria-label={`View ${alt.business_name}'s profile`}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl active:scale-[0.99] transition"
        style={{
          background: '#FFFFFF',
          border: `1px solid ${BORDER}`,
          minHeight: 64,
        }}
      >
        <div className="shrink-0 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={altShowcasePhoto}
            alt=""
            className="w-12 h-12 rounded-full object-cover"
            style={{ border: `1px solid ${BORDER}`, background: INPUT_BG }}
          />
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
            style={{
              background: '#22C55E',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 6px rgba(34,197,94,0.65)',
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold truncate" style={{ color: TEXT_INK }}>
            {alt.business_name}
          </div>
          <div className="text-[12px] truncate mt-0.5" style={{ color: TEXT_MUTED }}>
            {distanceKm != null
              ? <>{distanceKm.toFixed(1)} km from pickup</>
              : (alt.area || alt.city || 'Online')}
          </div>
          {showRate && (
            <div className="text-[12px] font-extrabold mt-0.5" style={{ color: '#854D0E' }}>
              From {idr(alt.min_fee!)} · {idr(alt.price_per_km!)}/km
            </div>
          )}
        </div>

        <span
          className="shrink-0 inline-flex items-center justify-center"
          style={{ color: TEXT_MUTED }}
          aria-hidden
        >
          <MapPin className="w-4 h-4" strokeWidth={2.5} />
        </span>
      </Link>
    </li>
  )
}
