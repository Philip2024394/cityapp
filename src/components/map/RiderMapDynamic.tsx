'use client'
import dynamic from 'next/dynamic'

// Maplibre needs window — must be client-only.
const RiderMap = dynamic(() => import('./RiderMap'), {
  ssr: false,
  loading: () => (
    <div
      className="border border-line rounded-2xl shimmer"
      style={{ height: 320, width: '100%' }}
    />
  ),
})

export default RiderMap
