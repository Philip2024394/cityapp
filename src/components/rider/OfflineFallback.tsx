'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Rider } from '@/types/rider'
import RiderCard from './RiderCard'
import { haversineKm } from '@/lib/geo/haversine'
import { quoteFare } from '@/lib/pricing/quote'

type Props = {
  offlineRider: Rider
  nearbyRiders: Rider[]
  customerLocation: { lat: number; lng: number } | null
}

export default function OfflineFallback({ offlineRider, nearbyRiders, customerLocation }: Props) {
  // 'busy' = on an active delivery, will be free soon. 'offline' = went
  // off-duty, may or may not return today. We use different copy + tint
  // so the customer can decide whether to wait or book someone else.
  const busy = offlineRider.availability === 'busy'
  const [withDistance, _] = useState(() =>
    nearbyRiders
      .map(r => {
        const distanceKm = customerLocation
          ? haversineKm(customerLocation, { lat: r.lat, lng: r.lng })
          : haversineKm({ lat: offlineRider.lat, lng: offlineRider.lng }, { lat: r.lat, lng: r.lng })
        return {
          rider: r,
          distanceKm,
          fare: quoteFare(distanceKm, { pricePerKm: r.pricePerKm, minFee: r.minFee }),
        }
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5),
  )

  return (
    <div className="space-y-3">
      <div
        className="card p-4"
        style={
          busy
            ? { background: 'rgba(96,165,250,0.06)', borderColor: 'rgba(96,165,250,0.25)' }
            : { background: 'rgba(148,163,184,0.05)', borderColor: 'rgba(148,163,184,0.20)' }
        }
      >
        <div
          className="text-[13px] font-extrabold uppercase tracking-wider flex items-center gap-2"
          style={{ color: busy ? '#60A5FA' : '#94A3B8' }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              background: busy ? '#60A5FA' : '#94A3B8',
              boxShadow: busy ? '0 0 8px rgba(96,165,250,0.85)' : 'none',
              animation: busy ? 'pulse 1.4s ease-in-out infinite' : 'none',
            }}
          />
          {busy
            ? `${offlineRider.name} is on a service`
            : `${offlineRider.name} is offline`}
        </div>
        <div className="text-[15px] mt-1">
          {busy
            ? 'This rider is on a delivery right now. Will be available again shortly — or pick one of the nearest online riders below:'
            : "This rider is offline right now. We've found the nearest online riders for you:"}
        </div>
      </div>

      <div className="space-y-2.5">
        {withDistance.map(({ rider, distanceKm, fare }) => (
          <RiderCard
            key={rider.id}
            rider={rider}
            distanceKm={distanceKm}
            estimatedFare={fare}
            href={`/r/${rider.slug}`}
          />
        ))}
      </div>

      <Link
        href="/"
        className="card p-4 flex items-center justify-between hover:border-brand/40 transition"
      >
        <div>
          <div className="font-bold text-[15px]">See all nearby riders</div>
          <div className="text-[13px] text-muted mt-0.5">Full marketplace with filters</div>
        </div>
        <ChevronRight className="w-5 h-5 text-brand" />
      </Link>
    </div>
  )
}
