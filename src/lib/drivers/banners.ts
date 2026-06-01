// Driver banner library — curated hero backdrops a driver can pick from
// their dashboard to override the vehicle-type default rendered by
// DriverProfileShell.
//
// Shape mirrors the handyman banner data file: two readonly arrays
// (car / bike), each entry is { id, url, label? }. The picker on the
// dashboard renders the matching list based on the driver's vehicle_type
// and writes the chosen URL into drivers.cover_image_url via the
// existing dashboard save handler. NULL = fall back to the vehicle-type
// default (DEFAULT_BIKE_HERO / DEFAULT_CAR_HERO in DriverProfileShell).

export type DriverBanner = { id: string; url: string; label?: string }

export const CAR_BANNERS: ReadonlyArray<DriverBanner> = [
  { id: 'car-01', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2003_38_55%20AM.png', label: 'Banner 1' },
  { id: 'car-02', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2003_35_27%20AM.png', label: 'Banner 2' },
  { id: 'car-03', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2003_50_36%20AM.png', label: 'Banner 3' },
  { id: 'car-04', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2003_52_28%20AM.png', label: 'Banner 4' },
  { id: 'car-05', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2003_53_47%20AM.png', label: 'Banner 5' },
  { id: 'car-06', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2003_55_26%20AM.png', label: 'Banner 6' },
  { id: 'car-07', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2003_57_48%20AM.png', label: 'Banner 7' },
  { id: 'car-08', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2004_00_27%20AM.png', label: 'Banner 8' },
  { id: 'car-09', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2004_02_54%20AM.png', label: 'Banner 9' },
  { id: 'car-10', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2004_04_14%20AM.png', label: 'Banner 10' },
  { id: 'car-11', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2004_05_49%20AM.png', label: 'Banner 11' },
  { id: 'car-12', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2004_07_14%20AM.png', label: 'Banner 12' },
  { id: 'car-13', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2004_08_53%20AM.png', label: 'Banner 13' },
  { id: 'car-14', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2028,%202026,%2004_11_40%20AM.png', label: 'Banner 14' },
]

export const BIKE_BANNERS: ReadonlyArray<DriverBanner> = [
  { id: 'bike-01', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2006_53_11%20AM.png', label: 'Banner 1' },
  { id: 'bike-02', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2007_30_37%20AM%20(1).png', label: 'Banner 2' },
  { id: 'bike-03', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2007_29_03%20AM.png', label: 'Banner 3' },
  { id: 'bike-04', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2007_28_37%20AM.png', label: 'Banner 4' },
  { id: 'bike-05', url: 'https://ik.imagekit.io/nepgaxllc/Untitleddsfsdfsddsssddfssdfsdfsdf.png', label: 'Banner 5' },
  { id: 'bike-06', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2007_24_51%20AM.png', label: 'Banner 6' },
  { id: 'bike-07', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2007_23_02%20AM.png', label: 'Banner 7' },
  { id: 'bike-08', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2007_21_58%20AM.png', label: 'Banner 8' },
  { id: 'bike-09', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Jun%201,%202026,%2007_20_55%20AM.png', label: 'Banner 9' },
  { id: 'bike-10', url: 'https://ik.imagekit.io/nepgaxllc/Untitleddsfsdfsddsssddfssdf.png', label: 'Banner 10' },
]

// Truck-specific banners — moving / hauling / utility-rental vibes.
// Founder-supplied 2026-05-31.
export const TRUCK_BANNERS: ReadonlyArray<DriverBanner> = [
  { id: 'truck-01', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2004_39_58%20PM.png', label: 'Banner 1' },
]

// Jeep-specific banners — off-road / volcano / sunrise tour vibes.
// Founder-supplied 2026-05-31.
export const JEEP_BANNERS: ReadonlyArray<DriverBanner> = [
  { id: 'jeep-01', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_44_53%20AM.png', label: 'Banner 1' },
  { id: 'jeep-02', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_45_41%20AM.png', label: 'Banner 2' },
  { id: 'jeep-03', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_47_17%20AM.png', label: 'Banner 3' },
  { id: 'jeep-04', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_49_12%20AM.png', label: 'Banner 4' },
  { id: 'jeep-05', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_50_01%20AM.png', label: 'Banner 5' },
  { id: 'jeep-06', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_52_32%20AM.png', label: 'Banner 6' },
  { id: 'jeep-07', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_55_24%20AM.png', label: 'Banner 7' },
  { id: 'jeep-08', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_58_34%20AM.png', label: 'Banner 8' },
  { id: 'jeep-09', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2011_59_52%20AM.png', label: 'Banner 9' },
  { id: 'jeep-10', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_02_06%20PM.png', label: 'Banner 10' },
  { id: 'jeep-11', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_04_17%20PM.png', label: 'Banner 11' },
  { id: 'jeep-12', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_05_47%20PM.png', label: 'Banner 12' },
  { id: 'jeep-13', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_07_19%20PM.png', label: 'Banner 13' },
  { id: 'jeep-14', url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2031,%202026,%2012_08_55%20PM.png', label: 'Banner 14' },
]

// Resolve the vehicle-type default banner URL. Matches the constants
// hard-coded inside DriverProfileShell so the dashboard preview lines up
// with what the public profile actually renders when no banner is set.
export function getDefaultBanner(vehicleType: string | null): string {
  if (vehicleType === 'bike') return BIKE_BANNERS[0]!.url
  if (vehicleType === 'jeep') return JEEP_BANNERS[0]!.url
  if (vehicleType === 'truck') return TRUCK_BANNERS[0]!.url
  return CAR_BANNERS[0]!.url
}

/** Returns the curated banner library for a given vehicle type. Used by
 *  mock-driver hero rendering so each demo profile gets a distinct cover
 *  image keyed off the slug rather than every mock falling back to the
 *  same vehicle-type default. */
export function bannersForVehicleType(vehicleType: string | null): ReadonlyArray<DriverBanner> {
  if (vehicleType === 'bike') return BIKE_BANNERS
  if (vehicleType === 'jeep') return JEEP_BANNERS
  if (vehicleType === 'truck') return TRUCK_BANNERS
  return CAR_BANNERS
}

/** Deterministic hash of a slug → banner index in the supplied library.
 *  Same slug always returns the same banner; different slugs spread
 *  across the library so mock-profile heroes feel varied. */
export function bannerForSlug(slug: string | null | undefined, banners: ReadonlyArray<DriverBanner>): string | null {
  if (!slug || banners.length === 0) return null
  let seed = 0
  for (const ch of slug) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  return banners[seed % banners.length]!.url
}
