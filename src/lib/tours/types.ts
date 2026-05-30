// ============================================================================
// Tour package — shared TypeScript shape for driver_tour_packages rows.
// Matches mig 0157 column-for-column. Consumed by the driver dashboard
// editor (/dashboard/{car|rider}/tours), the public profile shell, and
// the Places "tours that visit here" panel.
// ============================================================================

export type TourPackage = {
  id:              string
  driver_id:       string
  template_id:     string | null
  title:           string
  description:     string | null
  duration_hours:  number
  max_pax:         number | null
  price_idr:       number
  includes:        string[]
  excludes:        string[]
  place_slugs:     string[]
  photo_url:       string | null
  published:       boolean
  created_at:      string
  updated_at:      string
}
