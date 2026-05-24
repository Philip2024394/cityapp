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
  | 'volcano'
  | 'jungle'
  | 'village'
  | 'rice_paddy'
  | 'cave'
  | 'waterfall'
  | 'coffee_plantation'
  | 'handy_crafts'
  | 'batik_workshop'
  | 'food_tour'
  | 'cultural_ceremony'
  | 'snorkeling'
  | 'diving'
  | 'surfing'
  | 'yoga_retreat'

export type TourService = {
  id: TourServiceId
  label: string
  emoji: string
}

// Single canonical list — drives both the multi-select on the
// signup form (max 3) and the single-select on the dashboard.
// Add new entries here; the DB column is text[] so no migration
// is needed when this list grows.
export const TOUR_SERVICES: readonly TourService[] = [
  { id: 'temples',           label: 'Temples',           emoji: '🛕' },
  { id: 'beaches',           label: 'Beaches',           emoji: '🏖️' },
  { id: 'landmarks',         label: 'Landmarks',         emoji: '🗿' },
  { id: 'city_center',       label: 'City Tour',         emoji: '🏙️' },
  { id: 'mountain',          label: 'Mountain',          emoji: '⛰️' },
  { id: 'volcano',           label: 'Volcano',           emoji: '🌋' },
  { id: 'jungle',            label: 'Jungle',            emoji: '🌴' },
  { id: 'village',           label: 'Village',           emoji: '🏘️' },
  { id: 'rice_paddy',        label: 'Rice Paddy',        emoji: '🌾' },
  { id: 'cave',              label: 'Cave',              emoji: '🕳️' },
  { id: 'waterfall',         label: 'Waterfall',         emoji: '💦' },
  { id: 'coffee_plantation', label: 'Coffee Plantation', emoji: '☕' },
  { id: 'handy_crafts',      label: 'Handicrafts',       emoji: '🪡' },
  { id: 'batik_workshop',    label: 'Batik Workshop',    emoji: '🎨' },
  { id: 'food_tour',         label: 'Food Tour',         emoji: '🍜' },
  { id: 'cultural_ceremony', label: 'Cultural Ceremony', emoji: '🪔' },
  { id: 'snorkeling',        label: 'Snorkeling',        emoji: '🤿' },
  { id: 'diving',            label: 'Diving',            emoji: '🐠' },
  { id: 'surfing',           label: 'Surfing',           emoji: '🏄' },
  { id: 'yoga_retreat',      label: 'Yoga Retreat',      emoji: '🧘' },
] as const

export const TOUR_SERVICE_IDS: readonly TourServiceId[] =
  TOUR_SERVICES.map((s) => s.id)

export const MAX_TOUR_SERVICES = 3

export function findTourService(id: string): TourService | null {
  return TOUR_SERVICES.find((s) => s.id === id) ?? null
}
