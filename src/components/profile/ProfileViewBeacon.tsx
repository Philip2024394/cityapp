'use client'
import { useProfileViewTracker } from '@/hooks/useProfileViewTracker'

// Tiny client island that just fires the profile-view ping on mount.
// Drop into server-rendered profile pages (e.g. /bus/[slug]) where we
// can't use the hook directly. Renders nothing.
export default function ProfileViewBeacon({
  providerType,
  providerId,
}: {
  providerType: 'driver' | 'bike_rental' | 'tour_guide' | 'massage' | 'beautician' | 'laundry' | 'handyman' | 'home_clean'
  providerId:   string | null | undefined
}) {
  useProfileViewTracker({ providerType, providerId })
  return null
}
