# City Rider — Ops Setup Guide

Code is shipped. This file is the human-action checklist that gets City Rider from "code-ready" to "5,000-driver-ready."

Three external services + a handful of env vars. Estimated time: ~90 minutes if all accounts pre-exist, ~3 hours if you're registering them fresh.

---

## 1. Supabase Auth Phone provider (Twilio recommended)

Cityrider uses Supabase Auth phone OTP for signup + login. The code is wired correctly; the only missing piece is the SMS gateway behind it.

**Why Twilio:** best Indonesian delivery rate, transparent pricing (~Rp 250–500 per SMS depending on operator), simple Supabase integration.

### Steps

1. Create Twilio account at https://www.twilio.com/try-twilio (free trial gives ~$15 credit).
2. Buy a number with SMS capability in any country (you don't need an Indonesian number — Twilio routes outbound).
3. Note your **Account SID** and **Auth Token** from the Twilio console.
4. Go to Supabase Studio → **Authentication** → **Providers** → **Phone**.
5. Toggle Phone enabled. SMS provider = **Twilio**.
6. Paste Account SID, Auth Token, and your Twilio Messaging Service SID (or sender number).
7. Save.

### Verify

```bash
# From a real Indonesian mobile, visit:
https://cityrider.id/signup

# Enter your phone in 6281... format. You should receive an OTP within 10 s.
```

### Cost planning (5,000 drivers)

Assume 1 SMS at signup + 1 at first login + ~3 logins per year per driver:
- Year 1 SMS: 5,000 × 5 ≈ 25,000 SMS
- At Rp 350 average: **Rp ~9 M / year** for OTP

That's bearable. If you exceed Twilio's free tier (10K SMS/mo) you'll pay-as-you-go in USD.

---

## 2. Midtrans Snap (subscription billing)

This is what flips you from "admin manually marks paid" to "drivers self-renew at scale."

### Steps

1. Register at https://midtrans.com → choose **Snap** product.
2. Complete KYC: PT-level business docs, NPWP, signatory KTP, bank account.
   - Approval typically takes 3–7 business days.
3. Once approved, log in → **Settings** → **Access Keys**.
4. Grab both:
   - `MIDTRANS_SERVER_KEY` — starts with `Mid-server-...` (prod) or `SB-Mid-server-...` (sandbox)
   - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` — starts with `Mid-client-...` or `SB-Mid-client-...`
5. Add both to Vercel env (Production + Preview).
   - `MIDTRANS_SERVER_KEY` — sensitive, server-only
   - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` — public, exposed to client bundle (this is fine; it's the public key)
   - `MIDTRANS_PRODUCTION=true` once you want to bill real money (default: sandbox)
6. Configure the webhook URL: **Settings** → **Configuration** → **Payment Notification URL**:
   ```
   https://cityrider.id/api/payments/snap/webhook
   ```
   Health check: `GET https://cityrider.id/api/payments/snap/webhook` should return `{"ok":true,"route":"..."}`.

### Verify (sandbox first)

1. Set the SB-prefixed keys, `MIDTRANS_PRODUCTION=false`.
2. Sign up a test driver, complete onboarding.
3. On dashboard, the Subscription card now has a **Renew · Rp 30.000 / 30 days** button.
4. Tap it → Snap popup opens → pick QRIS → use a test phone number → settles.
5. Within 5 seconds, the dashboard auto-refreshes showing `Active`.
6. Check `payment_intents` table: row should show `status='paid'`, `paid_at` set, `provider_txn_id` populated.
7. Check `subscriptions` table: `current_period_end` extended by 30 days, `status='active'`.

### Cost

Midtrans takes ~2.9% + Rp 2,000 per QRIS transaction. On a Rp 30,000 renewal that's ~Rp 2,870 → driver receives ~Rp 27,130 net. Build that into your pricing if needed (you could move to Rp 35K to fully cover).

---

## 3. Affiliate payout provider

You have three options. Pick one:

### Option A — Manual bank transfer (default, no setup)

You manually transfer to each agent from your business bank account, then in `/admin/payouts` click **Mark paid** with the bank reference number.

- ✅ Zero setup, zero ongoing cost
- ❌ Doesn't scale past ~50 payouts/month

### Option B — Xendit Disbursements (recommended for 100+ agents)

https://www.xendit.co/id/products/disbursement/

- One-time KYC (similar to Midtrans)
- Bulk batch transfer API supports up to 1,000 disbursements per call
- Cost: ~Rp 5,000 per transfer
- Code hook: in `affiliate_payouts` set `provider='xendit'`, build a `xendit-disburse.ts` lib parallel to `midtrans/snap.ts` (~2 hours of work)

### Option C — Midtrans Iris (same Midtrans account as billing)

https://docs.midtrans.com/reference/iris-overview

- Reuses the Midtrans merchant account
- Cost: ~Rp 4,000 per transfer
- Slightly less flexible than Xendit but one less provider to manage

### Verification (whichever option)

1. Run aggregation: from `/admin/payouts`, click **Run aggregation**.
2. Check `affiliate_payouts` table — one pending row per agent with approved referrals.
3. For each row, click **Mark paid**, enter the bank ref → status flips, referrals roll up to `status='paid'`.
4. Agent sees their payment in the Affiliate.jsx dashboard (already wired).

---

## 4. Env vars to add (Vercel Production + Preview)

```
# Supabase — already configured
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Midtrans (NEW)
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY   ← public (client bundle)
MIDTRANS_SERVER_KEY                ← server only
MIDTRANS_PRODUCTION=true           ← when ready for real money

# Vercel cron secret (NEW) — generate a random 32+ char string
CRON_SECRET                        ← server only

# Optional, future
RESEND_API_KEY                     ← if you send transactional email
```

---

## 5. Production scale-readiness checklist

Code-side (already done in commit history):

- [x] Database indexes for hot queries at 5k+ drivers (migration 0017)
- [x] RLS on every table, no public writes except documented exceptions
- [x] payment_intents idempotency on webhook
- [x] affiliate_referrals dedup index
- [x] Vercel cron for weekly payout aggregation

Operational (you do these):

- [ ] Supabase project upgraded from Free → Pro (~$25/mo). Free tier caps out around 500 MAU.
- [ ] Vercel project upgraded to Pro if needed (cron requires Pro on paid tier).
- [ ] Twilio account funded with at least Rp 5 M (covers ~14,000 SMS).
- [ ] Midtrans webhook URL configured + tested with sandbox.
- [ ] Domain DNS pointing at Vercel.
- [ ] `cityrider.id` SSL active (auto via Vercel).
- [ ] Plausible / PostHog analytics script if you want traffic data.
- [ ] First batch of admin users: insert into `profiles` with `role='admin'` directly via SQL.

Monitoring (recommended):

- [ ] Supabase log drain to a log aggregator (Logflare free tier works).
- [ ] Vercel deploy notifications to Slack/Discord.
- [ ] A simple uptime check on `/api/payments/snap/webhook` (UptimeRobot free).
- [ ] Set Supabase billing alert at 70% of plan quota.

---

## 6. Manual smoke-test before flipping `MIDTRANS_PRODUCTION=true`

1. Sign up a test driver from a real phone — receive OTP, complete onboarding.
2. Wait for trial expiry (or manually set `subscriptions.current_period_end = now()` for that test driver).
3. As that driver, tap Renew → complete Snap payment in sandbox.
4. Verify `subscriptions.current_period_end` advanced by 30 days.
5. Sign up a second user as an affiliate via `localhost:5173/affiliate`. Get their `agent_code`.
6. Admin marks the agent `status='active'`.
7. From a fresh browser, visit `localhost:5186/?ref=<agent_code>` → complete onboarding → check `affiliate_referrals` for one new `pending` row.
8. As that driver, tap Renew → on settlement the trigger flips the referral to `approved` and sets `commission_amount`.
9. Admin: `/admin/payouts` → Run aggregation → one pending payout row appears.
10. Admin: Mark paid → referral flips to `paid`, payout closes.

If all 10 steps work in sandbox, swap `MIDTRANS_PRODUCTION=true` and re-test step 4 with a single Rp 1,000 production transaction before going public.

---

## Questions / blockers? Ping the engineering channel.
