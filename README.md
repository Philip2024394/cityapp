# City Rider

Mobile-first PWA marketplace for independent Indonesian motorcycle couriers. Riders own their profile, set their own prices, keep 100% earnings. Platform monetises via Rp 30.000/month subscription only — no commission, no dispatch.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS — yellow / black / white
- Supabase (Postgres + Auth + Realtime + PostGIS)
- Maplibre GL + OpenFreeMap (OSM vector tiles, no API key)
- Vaul (bottom sheets)
- Web Audio API (in-app beep), Vibration API (haptics)
- Vercel hosting

## Dev

```bash
npm install
cp .env.local.example .env.local   # fill Supabase keys when ready
npm run dev                         # defaults to port 3000; monorepo runs on 5186
npm run build                       # production build
npm run typecheck                   # tsc --noEmit
```

App works without Supabase env — falls back to mock riders.

## Routes

- `/` — Marketplace (map + pickup/dropoff picker + rider list + WhatsApp handoff)
- `/r/[slug]` — Public rider profile (online) OR offline-fallback marketplace
- `/dashboard` — Rider dashboard (GO ONLINE toggle, quote inbox, stats)
- `/profile` — Profile + bike editor
- `/pricing` — Per-km rate + min fee sliders, live quote preview
- `/services` — Service type toggles (Package, Food, Courier, Personal)
- `/login`, `/signup`, `/forgot` — Auth

## Booking flow

1. Customer enters pickup (auto-GPS) + dropoff (tap on map)
2. App computes Haversine distance × rider's per-km rate (respecting min fee)
3. Rider cards re-sort by total fare for this trip
4. Customer taps a rider → quote receipt drawer
5. "Kirim ke WhatsApp" → opens wa.me link with prefilled message:
   - Greeting, pickup + dropoff addresses
   - Both OSM location pins (clickable)
   - Distance + fare estimate
6. Platform beeps + logs `quote_events` row (analytics)
7. Phase 2: server fires Web Push to rider's device

## Offline-fallback pattern

When customer visits a rider's profile and that rider is offline, page renders the marketplace of 5 nearest online riders instead — every dead lead converts.

## Phase roadmap

- ✅ Phase 1 — UI, marketplace, profile pages, dashboard, mock data
- ⏳ Phase 2 — Supabase auth + DB wiring, real GPS persistence, Web Push
- ⏳ Phase 3 — Maplibre live rider pins via Supabase Realtime
- ⏳ Phase 4 — Midtrans Recurring billing
- ⏳ Phase 5 — Polish (confetti, prayer-time auto-offline, Bahasa pass)
