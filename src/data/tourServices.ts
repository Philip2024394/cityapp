// ============================================================================
// Tour-guide service categories
// ----------------------------------------------------------------------------
// Fixed taxonomy of what a tour guide can specialise in. Listings pick at
// most 3 so each card stays scannable. Add new entries here as the catalog
// grows — the column is `text[]` in tour_guide_listings so no migration
// is needed when this list changes.
// ============================================================================

export type TourServiceId =
  | 'temples'
  | 'beaches'
  | 'landmarks'
  | 'city_center'
  | 'mountain'
  | 'jungle'
  | 'village'
  | 'cave'
  | 'waterfall'
  | 'handy_crafts'

export type TourService = {
  id: TourServiceId
  label: string
  emoji: string
}

export const TOUR_SERVICES: readonly TourService[] = [
  { id: 'temples',      label: 'Temples',      emoji: '🛕' },
  { id: 'beaches',      label: 'Beaches',      emoji: '🏖️' },
  { id: 'landmarks',    label: 'Landmarks',    emoji: '🗿' },
  { id: 'city_center',  label: 'City Center',  emoji: '🏙️' },
  { id: 'mountain',     label: 'Mountain',     emoji: '⛰️' },
  { id: 'jungle',       label: 'Jungle',       emoji: '🌴' },
  { id: 'village',      label: 'Village',      emoji: '🏘️' },
  { id: 'cave',         label: 'Cave',         emoji: '🕳️' },
  { id: 'waterfall',    label: 'Waterfall',    emoji: '💦' },
  { id: 'handy_crafts', label: 'Handy Crafts', emoji: '🪡' },
] as const

export const TOUR_SERVICE_IDS: readonly TourServiceId[] =
  TOUR_SERVICES.map((s) => s.id)

export const MAX_TOUR_SERVICES = 3

export function findTourService(id: string): TourService | null {
  return TOUR_SERVICES.find((s) => s.id === id) ?? null
}
