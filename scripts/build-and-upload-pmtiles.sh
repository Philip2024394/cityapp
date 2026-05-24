#!/usr/bin/env bash
# ============================================================================
# build-and-upload-pmtiles.sh
# ----------------------------------------------------------------------------
# One-shot Indonesia PMTiles archive build + R2 upload. Run from a
# Unix shell with `pmtiles`, `rclone`, and `curl` on PATH.
#
# What it does:
#   1. Discover the most recent Protomaps daily build (publishes once
#      every 24h around 06:00 UTC)
#   2. Extract the Indonesia bbox (95° / -11° / 142° / 6°) into a single
#      indonesia.pmtiles file via HTTP Range requests — no full planet
#      download needed (~2.2 GB output vs 90+ GB planet)
#   3. Upload to R2 via rclone with chunked S3 transfer
#   4. Print the public r2.dev URL to copy into NEXT_PUBLIC_PMTILES_URL
#
# Prereqs (one-time setup):
#   • Install pmtiles CLI:    brew install protomaps/tap/pmtiles  (or go install github.com/protomaps/go-pmtiles@latest)
#   • Install rclone:         brew install rclone
#   • Configure rclone R2:    rclone config — see RCLONE_SETUP below
#   • Cloudflare R2 bucket created with public r2.dev access enabled
#
# Re-run cadence: monthly (Protomaps publishes daily; we only need fresh
# OSM data every 1-3 months for an accurate map).
# ============================================================================

set -euo pipefail

# ─── Config ────────────────────────────────────────────────────────────────
BUCKET="${R2_BUCKET:-cityriders-tiles}"
REMOTE="${RCLONE_REMOTE:-r2}"  # rclone remote name configured for R2
INDONESIA_BBOX="95,-11,142,6"  # west,south,east,north (degrees)
LOCAL_OUT="indonesia.pmtiles"
R2_KEY="indonesia.pmtiles"

# ─── 1. Discover most recent Protomaps daily build ─────────────────────────
echo "→ Discovering most recent Protomaps build…"
# Walk back up to 7 days looking for a published build (publish is daily
# but occasionally skips).
SRC=""
for offset in 0 1 2 3 4 5 6 7; do
  DATE=$(date -u -d "$offset days ago" +%Y%m%d 2>/dev/null || date -u -v -"$offset"d +%Y%m%d)
  URL="https://build.protomaps.com/${DATE}.pmtiles"
  if curl -sI "$URL" | head -1 | grep -q '200'; then
    SRC="$URL"
    echo "  ✓ Found: $SRC"
    break
  fi
done
if [ -z "$SRC" ]; then
  echo "✗ No Protomaps build found in the last 7 days. Check https://build.protomaps.com/"
  exit 1
fi

# ─── 2. Extract Indonesia bbox ─────────────────────────────────────────────
echo "→ Extracting Indonesia bbox (this takes 5-15 min depending on connection)…"
pmtiles extract "$SRC" "$LOCAL_OUT" --bbox="$INDONESIA_BBOX"

SIZE=$(du -h "$LOCAL_OUT" | cut -f1)
echo "  ✓ Extract complete — $LOCAL_OUT ($SIZE)"

# ─── 3. Upload to R2 via rclone ────────────────────────────────────────────
echo "→ Uploading to R2 ($REMOTE:$BUCKET/$R2_KEY)…"
rclone copyto "$LOCAL_OUT" "$REMOTE:$BUCKET/$R2_KEY" \
  --s3-no-check-bucket \
  --s3-chunk-size=64M \
  --s3-upload-concurrency=4 \
  --progress

# ─── 4. Print the public URL ───────────────────────────────────────────────
echo ""
echo "============================================================"
echo "✓ Upload complete."
echo ""
echo "NEXT STEPS:"
echo "  1. In Cloudflare R2 → $BUCKET → Settings → enable r2.dev"
echo "     subdomain (or attach a custom domain)."
echo "  2. Copy the resulting URL, e.g."
echo "       https://pub-<hash>.r2.dev/$R2_KEY"
echo "  3. Set it in Vercel env (Production):"
echo "       NEXT_PUBLIC_PMTILES_URL=https://pub-<hash>.r2.dev/$R2_KEY"
echo "  4. Trigger a Vercel redeploy so the env var is baked in."
echo ""
echo "Once redeployed, resilientStyle.ts will route every vector tile"
echo "through your R2 archive instead of openfreemap.org. End-to-end"
echo "ownership achieved."
echo "============================================================"

# ─── RCLONE_SETUP (reference) ──────────────────────────────────────────────
# rclone config
#  n  new remote
#  name> r2
#  storage> s3
#  provider> Cloudflare
#  access_key_id> <R2 Access Key ID from Cloudflare dashboard>
#  secret_access_key> <R2 Secret Access Key>
#  region> auto
#  endpoint> https://<account-id>.r2.cloudflarestorage.com
#  All other prompts: defaults / blank.
# Verify: rclone lsd r2:
