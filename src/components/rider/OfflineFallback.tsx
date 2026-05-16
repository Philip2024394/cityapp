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
      <div className="card p-4 bg-offline/5 border-offline/20">
        <div className="text-[13px] font-extrabold uppercase tracking-wider text-muted">
          {offlineRider.name} sedang offline
        </div>
        <div className="text-[15px] mt-1">
          Rider ini sedang tidak aktif. Kami carikan rider terdekat yang sedang online untukmu:
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
          <div className="font-bold text-[15px]">Lihat semua rider terdekat</div>
          <div className="text-[13px] text-muted mt-0.5">Marketplace lengkap dengan filter</div>
        </div>
        <ChevronRight className="w-5 h-5 text-brand" />
      </Link>
    </div>
  )
}
