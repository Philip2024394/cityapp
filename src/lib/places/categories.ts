import {
  Landmark, Waves, Sparkles,
  Utensils, Coffee, Wine, Music,
  Stethoscope, Pill, Smile, Plus,
  ShoppingBag, Hotel,
  Plane, Train, Bus,
  Building2, Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { PlaceCategory, PlaceGroup } from './types'

export type CategoryMeta = {
  id: PlaceCategory
  group: PlaceGroup
  label: string       // Bahasa-leaning short label, ID-first audience
  labelEn: string
  Icon: LucideIcon
  gradient: string    // CSS background — used by the image placeholder
}

// Six groups, ~18 categories. Order inside each group is the order shown
// in the chip rail when that group is selected.
export const CATEGORIES: Record<PlaceCategory, CategoryMeta> = {
  // Transit
  airport:       { id: 'airport',       group: 'transit',    label: 'Bandara',         labelEn: 'Airport',        Icon: Plane,       gradient: 'linear-gradient(135deg, #1E3A8A, #0E7490)' },
  train_station: { id: 'train_station', group: 'transit',    label: 'Stasiun',         labelEn: 'Train',          Icon: Train,       gradient: 'linear-gradient(135deg, #1E40AF, #155E75)' },
  bus_station:   { id: 'bus_station',   group: 'transit',    label: 'Terminal',        labelEn: 'Bus',            Icon: Bus,         gradient: 'linear-gradient(135deg, #1D4ED8, #0F766E)' },

  // Tourist
  temple:        { id: 'temple',        group: 'tourist',    label: 'Candi',           labelEn: 'Temple',         Icon: Landmark,    gradient: 'linear-gradient(135deg, #92400E, #B45309)' },
  beach:         { id: 'beach',         group: 'tourist',    label: 'Pantai',          labelEn: 'Beach',          Icon: Waves,       gradient: 'linear-gradient(135deg, #155E75, #0E7490)' },
  attraction:    { id: 'attraction',    group: 'tourist',    label: 'Wisata',          labelEn: 'Attraction',     Icon: Sparkles,    gradient: 'linear-gradient(135deg, #B45309, #C2410C)' },

  // Eat & drink
  restaurant:    { id: 'restaurant',    group: 'eat_drink',  label: 'Resto',           labelEn: 'Restaurant',     Icon: Utensils,    gradient: 'linear-gradient(135deg, #9A3412, #7F1D1D)' },
  cafe:          { id: 'cafe',          group: 'eat_drink',  label: 'Kafe',            labelEn: 'Cafe',           Icon: Coffee,      gradient: 'linear-gradient(135deg, #78350F, #422006)' },
  bar:           { id: 'bar',           group: 'eat_drink',  label: 'Bar',             labelEn: 'Bar',            Icon: Wine,        gradient: 'linear-gradient(135deg, #7F1D1D, #581C87)' },
  club:          { id: 'club',          group: 'eat_drink',  label: 'Klub',            labelEn: 'Club',           Icon: Music,       gradient: 'linear-gradient(135deg, #4C1D95, #831843)' },

  // Health
  hospital:      { id: 'hospital',      group: 'health',     label: 'Rumah Sakit',     labelEn: 'Hospital',       Icon: Plus,        gradient: 'linear-gradient(135deg, #065F46, #0F766E)' },
  doctor:        { id: 'doctor',        group: 'health',     label: 'Dokter',          labelEn: 'Doctor',         Icon: Stethoscope, gradient: 'linear-gradient(135deg, #047857, #115E59)' },
  dentist:       { id: 'dentist',       group: 'health',     label: 'Dokter Gigi',     labelEn: 'Dentist',        Icon: Smile,       gradient: 'linear-gradient(135deg, #0F766E, #155E75)' },
  pharmacy:      { id: 'pharmacy',      group: 'health',     label: 'Apotek',          labelEn: 'Pharmacy',       Icon: Pill,        gradient: 'linear-gradient(135deg, #166534, #14532D)' },

  // Stay & shop
  hotel:         { id: 'hotel',         group: 'stay_shop',  label: 'Hotel',           labelEn: 'Hotel',          Icon: Hotel,       gradient: 'linear-gradient(135deg, #581C87, #6B21A8)' },
  mall:          { id: 'mall',          group: 'stay_shop',  label: 'Mall',            labelEn: 'Mall',           Icon: ShoppingBag, gradient: 'linear-gradient(135deg, #6B21A8, #9D174D)' },

  // Services
  government:    { id: 'government',    group: 'services',   label: 'Kantor',          labelEn: 'Government',     Icon: Building2,   gradient: 'linear-gradient(135deg, #334155, #1E293B)' },
  bike_repair:   { id: 'bike_repair',   group: 'services',   label: 'Bengkel',         labelEn: 'Bike repair',    Icon: Wrench,      gradient: 'linear-gradient(135deg, #44403C, #292524)' },
}

export type GroupMeta = {
  id: PlaceGroup
  label: string
  labelEn: string
  categories: PlaceCategory[]   // chips revealed when this group is active
}

// Group order = chip-rail order on /places. "Semua" (All) is implicit and
// rendered as a separate first chip by the component.
export const GROUPS: GroupMeta[] = [
  { id: 'tourist',   label: 'Wisata',     labelEn: 'Tourist',  categories: ['temple','beach','attraction'] },
  { id: 'eat_drink', label: 'Makan',      labelEn: 'Eat',      categories: ['restaurant','cafe','bar','club'] },
  { id: 'transit',   label: 'Transit',    labelEn: 'Transit',  categories: ['airport','train_station','bus_station'] },
  { id: 'health',    label: 'Kesehatan',  labelEn: 'Health',   categories: ['hospital','doctor','dentist','pharmacy'] },
  { id: 'stay_shop', label: 'Inap & Mal', labelEn: 'Stay',     categories: ['hotel','mall'] },
  { id: 'services',  label: 'Layanan',    labelEn: 'Services', categories: ['government','bike_repair'] },
]

export function categoryMeta(c: PlaceCategory): CategoryMeta {
  return CATEGORIES[c]
}

export function groupOf(c: PlaceCategory): PlaceGroup {
  return CATEGORIES[c].group
}
