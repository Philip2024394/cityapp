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
  {
    id: 'bike-default',
    url: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2027,%202026,%2006_53_11%20AM.png',
    label: 'Default bike hero',
  },
]

// Resolve the vehicle-type default banner URL. Matches the constants
// hard-coded inside DriverProfileShell so the dashboard preview lines up
// with what the public profile actually renders when no banner is set.
export function getDefaultBanner(vehicleType: string | null): string {
  if (vehicleType === 'bike') return BIKE_BANNERS[0]!.url
  return CAR_BANNERS[0]!.url
}
