// Demand intelligence — mock for Phase 1. In production, these zones
// and the hourly curves come from server-side aggregation of
// quote_events bucketed into H3 hexagons. For now, hand-tuned to match
// Yogyakarta's known activity patterns (lunch rush, mall hours, late-
// night students, etc.).

export type DemandZone = {
  id: string
  name: string
  lat: number
  lng: number
  /** 0–100: how many quote requests happening here right now */
  demand: number
  /** 0–100: how many riders currently online in this area */
  supply: number
  /** Display radius — purely visual, in pixels, not meters */
  sizePx: number
  /** Short reason for the recommendation */
  reason: string
}

// Compute category from demand vs supply ratio.
//  - green:  demand >> supply (under-served, go here)
//  - yellow: demand ~ supply (balanced, OK)
//  - red:    supply >> demand or oversaturated (avoid)
export type Category = 'green' | 'yellow' | 'red'
export function categoryFor(z: DemandZone): Category {
  if (z.demand === 0 && z.supply === 0) return 'yellow'
  const ratio = z.supply === 0 ? 999 : z.demand / z.supply
  if (ratio >= 2.0 && z.demand >= 30) return 'green'
  if (ratio <= 0.7 || z.supply >= 70)   return 'red'
  return 'yellow'
}

export const COLOR_FOR_CATEGORY: Record<Category, string> = {
  green:  '#22C55E',
  yellow: '#FACC15',
  red:    '#EF4444',
}

// Yogyakarta demand zones — manually placed at real high-traffic areas.
// Values are CURRENT-HOUR snapshot; in production they'd update every
// 15 min as quote_events flow in.
export const MOCK_ZONES: DemandZone[] = [
  { id: 'malioboro',     name: 'Malioboro',           lat: -7.7928, lng: 110.3657, demand: 78, supply: 12, sizePx: 140, reason: '12 quotes/hour, only 3 riders online' },
  { id: 'ugm',           name: 'UGM / Bulaksumur',    lat: -7.7700, lng: 110.3782, demand: 62, supply: 18, sizePx: 120, reason: 'Student lunch + dinner rush' },
  { id: 'ambarrukmo',    name: 'Ambarrukmo Plaza',    lat: -7.7826, lng: 110.4023, demand: 55, supply: 38, sizePx: 110, reason: 'Mall hours, food court active' },
  { id: 'tugu',          name: 'Tugu / Jl. Mangkubumi',lat: -7.7826, lng: 110.3672, demand: 42, supply: 22, sizePx: 100, reason: 'Cafe district, document deliveries' },
  { id: 'kraton',        name: 'Kraton',              lat: -7.8054, lng: 110.3641, demand: 35, supply: 28, sizePx: 90,  reason: 'Tourist + local mix' },
  { id: 'condongcatur',  name: 'Condongcatur',        lat: -7.7570, lng: 110.4080, demand: 48, supply: 16, sizePx: 110, reason: 'Residential food delivery zone' },
  { id: 'jl-solo',       name: 'Jl. Solo Km 6',       lat: -7.7820, lng: 110.4180, demand: 50, supply: 22, sizePx: 105, reason: 'Office workers ordering lunch' },
  { id: 'bantul',        name: 'Bantul',              lat: -7.8800, lng: 110.3290, demand: 18, supply: 6,  sizePx: 80,  reason: 'Quiet but uncontested' },
  { id: 'sleman',        name: 'Sleman',              lat: -7.7185, lng: 110.3556, demand: 24, supply: 32, sizePx: 90,  reason: 'Already crowded — skip' },
  { id: 'wirobrajan',    name: 'Wirobrajan',          lat: -7.8050, lng: 110.3500, demand: 28, supply: 14, sizePx: 85,  reason: 'Residential pickups' },
  { id: 'kotagede',      name: 'Kotagede',            lat: -7.8268, lng: 110.4006, demand: 22, supply: 9,  sizePx: 80,  reason: 'Workshop deliveries' },
  { id: 'bandara',       name: 'Bandara YIA road',    lat: -7.8780, lng: 110.0570, demand: 38, supply: 4,  sizePx: 95,  reason: 'Airport — premium fares possible' },
]

// Hourly demand by day of week. Values 0–100. Manually tuned to match
// Indonesian motorcycle-delivery patterns:
//   - Breakfast: low–medium (gojek dominates breakfast)
//   - Lunch:    11:00–13:30 PEAK
//   - Afternoon: slow lull
//   - Dinner:   18:00–20:30 PEAK
//   - Late:     21:00–23:00 students + bars (Fri/Sat heavier)
//
// Sundays generally lower (people cook at home / family lunch out).
// Fridays + Saturdays heaviest evenings.
//
// Indexed as DAY_HOURS[dayIndex (0=Sun)][hour (0-23)].
const RUSH_LUNCH = [10, 25, 50, 75, 80, 65, 45]                // 9–15
const RUSH_DINNER = [30, 55, 80, 85, 70, 50]                   // 17–22
const NIGHT = [35, 20, 12, 8]                                   // 22–01

export const DAY_HOURS: number[][] = [
  // Sunday — family day, lower overall
  hourly([5,15,28,32,28,30, ...RUSH_LUNCH.map(v => v * 0.85), 28,30, ...RUSH_DINNER.map(v => v * 0.85), ...NIGHT.map(v => v * 0.75)]),
  // Monday — strong workday
  hourly([6,18,32,38,32,30, ...RUSH_LUNCH, 30,32, ...RUSH_DINNER, ...NIGHT]),
  // Tuesday
  hourly([6,18,32,38,32,30, ...RUSH_LUNCH, 30,32, ...RUSH_DINNER, ...NIGHT]),
  // Wednesday
  hourly([6,18,32,38,32,30, ...RUSH_LUNCH, 30,32, ...RUSH_DINNER, ...NIGHT]),
  // Thursday
  hourly([6,18,32,38,32,30, ...RUSH_LUNCH, 30,32, ...RUSH_DINNER, ...NIGHT]),
  // Friday — heaviest evening (TGIF + payday)
  hourly([6,18,32,38,32,30, ...RUSH_LUNCH, 32,35, ...RUSH_DINNER.map(v => v * 1.15), ...NIGHT.map(v => v * 1.3)]),
  // Saturday — late lunch + heavy night
  hourly([5,10,18,25,30,38, ...RUSH_LUNCH.map(v => v * 1.1), 38,42, ...RUSH_DINNER.map(v => v * 1.20), ...NIGHT.map(v => v * 1.4)]),
]

// Force 24 entries and round
function hourly(arr: number[]): number[] {
  const out = arr.slice(0, 24).map(v => Math.max(0, Math.min(100, Math.round(v))))
  while (out.length < 24) out.push(0)
  return out
}

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export function dayName(idx: number): string { return DAY_NAMES_EN[idx] ?? '' }
export function dayNameId(idx: number): string { return DAY_NAMES_ID[idx] ?? '' }
