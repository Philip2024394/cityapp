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
//
// Audit (2026-06-02): TRIAL_DAYS was 7 but mig 0174 set the DB default
// to 30 — dashboard banner expired the trial on day 8 while the
// marketplace kept the driver visible through day 30. Synced both to
// 30 (the founder direction in mig 0174 header).
// ============================================================================

/** Monthly driver subscription price in IDR. */
export const SUBSCRIPTION_MONTHLY_IDR = 38_000

/** Yearly driver subscription price in IDR (≈ 23% off monthly × 12). */
export const SUBSCRIPTION_YEARLY_IDR = 350_000

/** Free trial length in days, applied when a driver completes onboarding.
 *  MUST equal the DB column default on `drivers.paid_until` (migration
 *  0174 sets that to `current_date + interval '30 days'`). If you change
 *  this, ship a follow-up migration that updates the column default in
 *  the same commit — otherwise the marketplace gate (paid_until) and the
 *  dashboard banner (trial_ends_at) will disagree about when the trial
 *  ended. 2026-06-02: synced to 30 to match mig 0174. */
export const TRIAL_DAYS = 30

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

// ─── Founder cohort — first 1000 Indonesian drivers locked at 38k forever ──
//
// Founder decision 2026-05-29: the first 1000 drivers in Indonesia keep
// the current monthly price (Rp 38.000) FOR LIFE. Drivers #1001+ pay the
// standard rate (TBD — kept at the same 38k as a placeholder so existing
// pricing copy doesn't lie until the new tier is decided). Set
// `STANDARD_MONTHLY_IDR` to the new rate the moment that decision lands
// and `MONTHLY_PRICE_LABEL` will keep showing founder pricing in copy
// because that constant is the founder rate.
//
// Implementation note: cohort status is derived from a row count on the
// drivers table at signup time (see src/lib/pricing/founderCohort.ts).
// Lock the determination on insert by stamping `founder_cohort` to a
// future migration; for now we compute it on the fly.

/** Hard cap on the founder cohort — first 1000 drivers in Indonesia. */
export const FOUNDER_COHORT_CAP = 1000

/** Monthly rate locked for founder-cohort drivers (Rp 38.000). */
export const FOUNDER_MONTHLY_IDR = SUBSCRIPTION_MONTHLY_IDR

/** Standard post-founder monthly rate. TBD — placeholder kept at the
 *  founder rate so copy stays honest until the higher tier is set. */
export const STANDARD_MONTHLY_IDR = SUBSCRIPTION_MONTHLY_IDR

/** "Pendiri · Rp 38.000/bulan seumur hidup" — copy for the badge. */
export const FOUNDER_BADGE_LABEL_ID =
  `Pendiri · ${MONTHLY_PRICE_LABEL}/bulan seumur hidup`

/** "Founder · Rp 38.000/month for life" — English variant. */
export const FOUNDER_BADGE_LABEL_EN =
  `Founder · ${MONTHLY_PRICE_LABEL}/month for life`
