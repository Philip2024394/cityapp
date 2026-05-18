'use client'
import { useState } from 'react'
import type { Place } from '@/lib/places/types'
import { categoryMeta } from '@/lib/places/categories'

// Renders the leading image on a place card. Phase 1 seed data has no
// real photos — places fall back to a category-gradient + icon. When a
// place owner uploads a photo (Phase 3), it slots straight into the
// image_urls array with no other changes required.
//
// Lazy-loaded with native loading="lazy" + decoding="async" so the
// initial card list paints fast on slow mobile networks.
export default function PlaceImage({
  place,
  className = '',
}: {
  place: Pick<Place, 'name' | 'category' | 'imageUrls'>
  className?: string
}) {
  const meta = categoryMeta(place.category)
  const firstImage = place.imageUrls[0]
  const [errored, setErrored] = useState(false)

  if (firstImage && !errored) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={firstImage}
          alt={place.name}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    )
  }

  const Icon = meta.Icon
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: meta.gradient }}
      role="img"
      aria-label={`${meta.labelEn} category`}
    >
      <Icon
        className="absolute inset-0 m-auto text-white/45"
        style={{ width: '40%', height: '40%' }}
        strokeWidth={1.5}
        aria-hidden
      />
    </div>
  )
}
