# PMTiles → R2 deploy checklist

End-to-end ownership of vector tile delivery for Indonesia. Once this is
done, every map tile in the app comes from your R2 bucket instead of the
public openfreemap.org service.

## One-time setup

- [ ] **Install pmtiles CLI**
  ```bash
  brew install protomaps/tap/pmtiles
  # or: go install github.com/protomaps/go-pmtiles@latest
  ```

- [ ] **Install rclone**
  ```bash
  brew install rclone
  ```

- [ ] **Create the R2 bucket**
  1. Cloudflare Dashboard → R2 → Create bucket → name `cityriders-tiles`
  2. Bucket Settings → enable the public **r2.dev** subdomain (or attach
     a custom domain like `tiles.cityriders.id`)

- [ ] **Create R2 API token**
  1. Cloudflare Dashboard → R2 → Manage R2 API Tokens → Create
  2. Permissions: **Object Read & Write**, restrict to your bucket
  3. Copy the **Access Key ID** + **Secret Access Key** — shown once

- [ ] **Configure rclone**
  ```bash
  rclone config
  ```
  Walk the prompts as documented at the bottom of `scripts/build-and-upload-pmtiles.sh`.
  Verify with:
  ```bash
  rclone lsd r2:
  ```

## Run the build + upload

- [ ] **Make the script executable**
  ```bash
  chmod +x scripts/build-and-upload-pmtiles.sh
  ```

- [ ] **Run it**
  ```bash
  ./scripts/build-and-upload-pmtiles.sh
  ```
  Expected wall-clock: 10–30 min depending on your connection (extract is
  the slow part — uses HTTP Range against the planet build).

- [ ] **Verify the upload landed**
  ```bash
  rclone ls r2:cityriders-tiles
  # Expect: ~2.2 GB indonesia.pmtiles
  ```

- [ ] **Note the public URL**
  After enabling the r2.dev subdomain, the file is reachable at:
  ```
  https://pub-<hash>.r2.dev/indonesia.pmtiles
  ```

## Wire into the app

- [ ] **Set the env var in Vercel** (Production scope)
  Project → Settings → Environment Variables → Add:
  ```
  NEXT_PUBLIC_PMTILES_URL=https://pub-<hash>.r2.dev/indonesia.pmtiles
  ```

- [ ] **Redeploy** (Vercel won't pick up the env until next deploy)
  ```bash
  git commit --allow-empty -m "chore: trigger redeploy for PMTILES_URL"
  git push origin main
  ```

- [ ] **Confirm in browser**
  1. Open `https://cityriders.id` in a fresh incognito tab
  2. Open DevTools → Network → filter by `r2.dev`
  3. Pan the map. You should see range-requested chunks of
     `indonesia.pmtiles` being fetched (HTTP 206 Partial Content)
  4. Check `tiles.openfreemap.org` is no longer being hit for the tile
     data flow (the small glyphs + sprite from `protomaps.github.io`
     are expected to stay)

## Refresh cadence

OSM data is community-edited daily; Protomaps republishes daily. Re-run
the same script every **1–3 months** to keep the map current. No code
changes needed — just `./scripts/build-and-upload-pmtiles.sh` again.

## Troubleshooting

- **`pmtiles extract` is slow** — Protomaps' CDN throttles range requests
  per IP. Re-running on a different network can help. Expected: 10–20 min
  for the Indonesia bbox.
- **rclone upload aborts** — bump `--s3-chunk-size` to 128M or use
  `--retries 10 --low-level-retries 20`.
- **r2.dev URL returns 403** — re-enable the subdomain in bucket settings;
  may take 5 min to propagate.
- **Map still shows openfreemap traffic after redeploy** — Vercel build
  cache. Check the env var landed (`vercel env ls`), then push another
  empty commit.

## What this protects you against

Once shipped, the tile flow is:

```
Browser → cr-tiles-v1 SW cache → R2 (Singapore POP) → indonesia.pmtiles
```

No third-party in the hot path. OpenFreeMap can disappear tomorrow and
the map keeps working.

---

# Layer 4 (bonus) — bundled APK PMTiles for true offline first launch

Optional add-on once Layer 2 ships. The Capacitor APK can ship a small
city-overview PMTiles file inside its assets so the map renders with
zero network on first launch — useful for tourists who land at the
airport with no Indonesian SIM yet.

The web app code (`src/lib/map/resilientStyle.ts`) already detects this
bundled asset at runtime via the Capacitor global and prefers it over
the R2 archive when present. You only need to slice + drop the file.

## Slice the city-overview file

Run from the same shell you used for the main build. Uses the same
`indonesia.pmtiles` from step 2 above as input.

- [ ] **Generate the city-overview slice** (zoom 0–12 only, ~30–50 MB)
  ```bash
  pmtiles extract indonesia.pmtiles cities-overview.pmtiles --maxzoom=12
  ```

- [ ] **Drop into the APK assets folder**
  ```bash
  mkdir -p android/app/src/main/assets/tiles
  cp cities-overview.pmtiles android/app/src/main/assets/tiles/
  ```

- [ ] **Rebuild the APK**
  ```bash
  npm run cap:sync
  npm run cap:build:android  # or cap:release:android once keystore is set
  ```

- [ ] **Verify on a fresh device install with airplane mode**
  Map should paint at city-overview zoom levels (1–12) with zero network.
  Zooming past 12 fails back to the R2 archive (needs internet) or the
  SW cache.

## When to refresh the bundled file

Same cadence as the R2 archive (every 1–3 months). Re-run the slice +
copy step, bump `versionCode` in `android/app/build.gradle`, and push a
new APK to Play Store.

## What the runtime code does

`resolveCapacitorAssetUrl()` in `resilientStyle.ts`:
- Returns null in browsers and SSR → no behaviour change for the web app
- Returns `capacitor://localhost/_capacitor_file_/android_asset/tiles/cities-overview.pmtiles`
  when running inside the Android APK
- A HEAD probe confirms the file actually exists before committing to
  it — if you build an APK without the slice, the code falls through
  to the R2 / OpenFreeMap path with no error
