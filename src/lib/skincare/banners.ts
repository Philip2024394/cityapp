import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { SKINCARE_SERVICE_LABELS, type SkincareServiceOffered } from './types'

// Skincare banner library — same shape as the other verticals. Default
// theme pink (#EC4899). The user requested the facial-home-service
// banner be available on this vertical too, so it's seeded under
// 'mixed' here as well.
export const SKINCARE_BANNER_LIBRARY: BannerLibrary = {
  '#EC4899': {
    mixed: [
      'https://ik.imagekit.io/7grri5v7d/facial%20home%20service.png?updatedAt=1771797186127',
    ],
  },
}

export const SKINCARE_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(SKINCARE_SERVICE_LABELS) as SkincareServiceOffered[]
).map((id) => ({ id, label: SKINCARE_SERVICE_LABELS[id] }))
