# City Rider

**Booking software for independent rider businesses.**
City Rider is a SaaS platform for individual rider entrepreneurs in Indonesia. Each rider runs their own independent transport / parcel / food-delivery business; the platform sells software access only. We never process trip payments, never auto-assign customers to riders, and never run a fleet.

## Core rules (architectural invariants)

- One driver = one independent rider business. No fleet hierarchy.
- The customer **always** picks the rider manually. Platform never auto-assigns.
- Payments flow directly customer ↔ rider (cash / QR / transfer). Platform records `payment_method` + `payment_status` only.
- Subscription: Rp 30.000/month per rider, paid directly to the platform.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + Realtime) — Singapore region
- Maplibre GL + OSM tiles
- Vercel hosting

## Local dev

```bash
npm install
cp .env.local.example .env.local       # fill in Supabase keys
npm run dev                             # defaults to port 3000
npm run build                           # production build
npm run typecheck                       # tsc --noEmit
```

App boots in **demo mode** (legacy mock data) when Supabase env vars are absent.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) in the **Singapore (SIN)** region.
2. Copy `Project URL`, `anon` key, and `service_role` key into `.env.local`.
3. Push the schema:
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   ```
   (Or paste the contents of `supabase/migrations/*.sql` into the Supabase SQL editor in order.)
4. Enable phone-OTP auth in the Supabase dashboard: Authentication → Providers → Phone. Configure an SMS provider (Twilio is default).
5. Restart `npm run dev`. The middleware now enforces auth on protected routes.

## Routes

| Path | Audience | Notes |
|---|---|---|
| `/` | Public | Landing page |
| `/cari` | Public | Trip planner (pickup / dropoff / pit stop) |
| `/cari/rider` | Public | Discovery — list of nearby independent riders. **Customer picks manually.** |
| `/r/[slug]` | Public | Single rider's public booking page |
| `/login`, `/signup`, `/forgot` | Public | Phone-OTP auth |
| `/onboarding` | Authenticated | New-rider wizard (slug, business name, pricing, QR upload) |
| `/dashboard` | Driver | Rider business dashboard |
| `/profile` | Driver | Profile + bike + pricing editor |
| `/admin` | Admin | Platform moderation |

## Booking flow (server-backed)

1. Customer enters pickup + dropoff on `/cari` → routed to `/cari/rider`
2. Discovery returns nearby riders sorted by distance/availability — **customer picks one manually**
3. Customer presses Book → server inserts a `trips` row with the chosen `driver_id` and `status = 'requested'`
4. Selected rider receives a realtime notification (Supabase Realtime + optional Web Push)
5. Rider accepts → `status = 'accepted'`. If declines or times out → `status = 'expired'`, customer returns and picks another.
6. Trip transitions: `requested → accepted → arrived → in_progress → completed`
7. On completion: rider's QR / transfer details / cash option are shown to the customer.
8. Customer marks paid → `payment_status = 'pending_confirmation'`. Rider confirms received → `payment_status = 'confirmed'`.
9. Customer rates the rider. `drivers.rating` and `drivers.trips_count` updated.

There is **no automated dispatch**. There is **no platform-controlled payment flow**.

## Rider availability

A rider's state is one of:

- **online** — visible on discovery + bookable
- **busy** — visible on discovery, Book button disabled, shown as "Currently busy"
- **offline** — visible on discovery, greyed out at the bottom, not bookable

Plus a `last_active_at` displayed as "Active just now / 3 min ago / 1 hr ago".

## Subscription enforcement (MVP)

- New riders start with `subscription.status = 'trial'` (14 days).
- After trial expires → `past_due`. Rider stays visible in discovery, but their Book button is disabled with a "Subscription expired" overlay.
- Admin manually flips `status = 'active'` when a transfer is received (no automated billing in MVP).

## Admin

`/admin` is the platform operator's console (Philip). Riders run their own
business on `/dashboard` and never see `/admin`.

To promote your account once, after signing in via phone OTP:

```sql
-- Run in Supabase SQL editor. Use the phone number you signed up with.
update public.profiles set role = 'admin' where phone = '62XXXXXXXXXXX';
```

After that, signing in to `/admin` gives you:

- **Overview** — counts (riders, subs, trips) + recent activity, with a banner when riders go past due.
- **Riders** — every driver row with status + subscription state; Suspend / Reactivate / Mark paid (+30 days) actions.
- **Trips** — live filter (requested → in_progress), completed, canceled.
- **Audit log** — every admin write (driver suspend, subscription paid, …) lands here with before/after diffs.

All admin mutations go through `/api/admin/*` route handlers that re-check `role = 'admin'` server-side and append to `public.audit_log`.

## Roadmap

- ✅ Phase 0 — Schema, auth, middleware, Supabase wiring
- ⏳ Phase 1 — Rider onboarding wizard, dashboard wired to real data
- ✅ Phase 2 — Real trip flow (server insert + realtime delivery to rider)
- ✅ Phase 3 — QR payment confirmation flow + ratings
- ✅ Phase 4 — Admin panel + production hardening
