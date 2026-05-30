// ============================================================================
// QRIS payment assets — single source of truth
// ----------------------------------------------------------------------------
// Driver subscription has TWO billing periods:
//   • Monthly — Rp 38,000  (30 days)
//   • Yearly  — Rp 350,000 (365 days; ~23% savings vs monthly × 12)
//
// Each period has its own static QRIS code the platform owner controls.
// The customer scans the matching QR in their banking app, pays the
// amount, screenshots the receipt, and uploads the screenshot. The
// platform never custodies funds — CityRiders is a software directory
// under PM 12/2019.
//
// Update these URLs when rotating QRIS codes. All subscription modals
// (rider / car / truck / future verticals) pull from here.
// ============================================================================

/** Monthly subscription QRIS (Rp 38,000 / 30 days). */
export const SUBSCRIPTION_QRIS_IMAGE_URL =
  'https://ik.imagekit.io/nepgaxllc/banner3dasda.png'

export const SUBSCRIPTION_QRIS_ALT =
  'CityRiders monthly subscription QRIS · Rp 38,000 per month'

/** Yearly subscription QRIS (Rp 350,000 / 365 days). */
export const SUBSCRIPTION_QRIS_YEARLY_IMAGE_URL =
  'https://ik.imagekit.io/nepgaxllc/banner3dasdaasdas.png'

export const SUBSCRIPTION_QRIS_YEARLY_ALT =
  'CityRiders yearly subscription QRIS · Rp 350,000 per year'
