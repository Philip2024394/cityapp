// ============================================================================
// Subscription pricing — single source of truth.
// ----------------------------------------------------------------------------
// Use these constants for any user-visible pricing/trial copy. Changing
// the platform's commercial terms should require ONE edit, not a sweep
// across signup / dashboard / landing / terms / about / SETUP_OPS.
//
// Audit (2026-05) flagged: signup said "14-day · Rp 30K", dashboard said
// "Rp 38K", landing said "7 days · Rp 38K". Misrepresentation under
// Play subscription policy AND UU 8/1999 (consumer protection).
// ============================================================================

/** Monthly driver subscription price in IDR. */
export const SUBSCRIPTION_MONTHLY_IDR = 38_000

/** Yearly driver subscription price in IDR (≈ 23% off monthly × 12). */
export const SUBSCRIPTION_YEARLY_IDR = 350_000

/** Free trial length in days, applied when a driver completes onboarding. */
export const TRIAL_DAYS = 7

/** Period extended per successful monthly renewal. */
export const MONTHLY_PERIOD_DAYS = 30

/** Period extended per successful yearly renewal. */
export const YEARLY_PERIOD_DAYS = 365

// ─── Pre-formatted Bahasa Indonesia strings ────────────────────────────────
// Use these in JSX so every surface reads the same exact text. Don't
// build "Rp 38.000/bulan" by hand anywhere else.

/** "Rp 38.000" */
export const MONTHLY_PRICE_LABEL = `Rp ${SUBSCRIPTION_MONTHLY_IDR.toLocaleString('id-ID')}`

/** "Rp 350.000" */
export const YEARLY_PRICE_LABEL = `Rp ${SUBSCRIPTION_YEARLY_IDR.toLocaleString('id-ID')}`

/** "Rp 38.000/bulan" */
export const MONTHLY_PRICE_PER_MONTH = `${MONTHLY_PRICE_LABEL}/bulan`

/** "Rp 350.000/tahun" */
export const YEARLY_PRICE_PER_YEAR = `${YEARLY_PRICE_LABEL}/tahun`

/** "Rp 38.000/bulan atau Rp 350.000/tahun" */
export const MONTHLY_OR_YEARLY_LABEL = `${MONTHLY_PRICE_PER_MONTH} atau ${YEARLY_PRICE_PER_YEAR}`

/** "7 hari gratis" */
export const TRIAL_LABEL_ID = `${TRIAL_DAYS} hari gratis`

/** "7-day free trial" */
export const TRIAL_LABEL_EN = `${TRIAL_DAYS}-day free trial`
