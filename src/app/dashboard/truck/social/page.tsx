// /dashboard/truck/social — Phase A social composer for truck drivers.
// Thin wrapper around SocialComposer. vertical="car" because the
// component's union is 'car' | 'rider' for now; truck shares the
// car share-quota bucket until we widen the union in a follow-up.

import SocialComposer from '@/components/dashboard/SocialComposer'

export default function TruckDriverSocialPage() {
  return <SocialComposer backHref="/dashboard/truck" vertical="car" />
}
