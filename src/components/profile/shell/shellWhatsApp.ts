import { buildBookingWaLink } from '@/lib/whatsapp/buildBookingMessage'
import type { DriverPublic } from '../DriverProfileShell'

// Thin adapter around the canonical buildBookingWaLink — re-shapes the
// shell's flat label state + multi-stop list + optional estimate breakdown
// into the unified options object. Returns '' when the driver's phone is
// unusable so the caller can disable the CTA.
export function buildShellWhatsAppLink(opts: {
  driver:    DriverPublic
  pickup:    string
  dropoff:   string
  stops:     string[]
  /** 'ride' → passenger transport copy; 'parcel' → parcel courier copy.
   *  Defaults to 'ride' for back-compat. */
  mode?:     'ride' | 'parcel'
  estimate?: { minFee: number; pricePerKm: number; pitstopFee: number; numStops: number } | null
}): string {
  return buildBookingWaLink({
    driver: {
      business_name: opts.driver.business_name,
      whatsapp_e164: opts.driver.whatsapp_e164,
    },
    mode: opts.mode ?? 'ride',
    pickup:   { label: opts.pickup,  coord: null },
    dropoff:  { label: opts.dropoff, coord: null },
    stops:    opts.stops,
    estimate: opts.estimate ?? null,
  })
}
