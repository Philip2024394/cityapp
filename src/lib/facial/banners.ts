import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { FACIAL_SERVICE_LABELS, type FacialServiceOffered } from './types'

// Facial banner library — same shape as the other verticals. Default
// theme pink (#EC4899). Banners drop under 'mixed' unless the filename
// unambiguously matches a specific facial modality.
export const FACIAL_BANNER_LIBRARY: BannerLibrary = {
  '#EC4899': {
    mixed: [
      'https://ik.imagekit.io/7grri5v7d/facial%20home%20service.png?updatedAt=1771797186127',
    ],
  },
}

export const FACIAL_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(FACIAL_SERVICE_LABELS) as FacialServiceOffered[]
).map((id) => ({ id, label: FACIAL_SERVICE_LABELS[id] }))
