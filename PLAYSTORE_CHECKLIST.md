# Play Store submission — pre-flight checklist

Status as of the readiness audit. Items marked `[x]` are done in code;
items marked `[ ]` need a one-time human action (keystore generation,
Firebase download, Play Console form). Total realistic time: ~5 days.

---

## 1. Release signing — CRITICAL BLOCKER

Without these the AAB is debug-signed and Play will reject it.

- [x] `signingConfigs.release` block added to `android/app/build.gradle`
- [x] `keystore.properties.example` template added
- [x] `*.keystore` + `keystore.properties` added to `android/.gitignore`
- [ ] **Generate the keystore** (one terminal command — RUN ONCE, BACK IT UP):

  ```powershell
  cd C:\Users\Victus\streetlocal\cityriders\android
  keytool -genkey -v -keystore cityrider-release.keystore `
          -alias cityrider -keyalg RSA -keysize 2048 -validity 10000
  ```

  Pick strong passwords when prompted. Write them down.

- [ ] **Create `android/keystore.properties`** (copy the .example file):

  ```
  storeFile=cityrider-release.keystore
  storePassword=<password-you-just-chose>
  keyAlias=cityrider
  keyPassword=<same-password-or-different>
  ```

- [ ] **Back up `cityrider-release.keystore` somewhere safe.** Losing it = losing the ability to update existing installs forever.

- [ ] **Paste the release SHA256 fingerprint into `public/.well-known/assetlinks.json`** — this enables Android App Links so a shared `https://citydrivers.id/r/<slug>` URL auto-opens the app instead of the browser. Without this, the link works but Play Store deep-link verification will fail. To get the fingerprint:

  ```powershell
  cd C:\Users\Victus\streetlocal\cityriders\android
  keytool -list -v -keystore cityrider-release.keystore -alias cityrider | findstr SHA256
  ```

  Copy the value (looks like `AB:CD:EF:...`) and replace `REPLACE_WITH_RELEASE_KEYSTORE_SHA256` at line 10 of `public/.well-known/assetlinks.json`. Then redeploy so `https://citydrivers.id/.well-known/assetlinks.json` serves the real fingerprint.

  Verify in `adb logcat | findstr -i intentfilter` after install — should see "Domain verification: success".

---

## 2. Firebase / FCM push — bookings won't notify until done

- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Add Android app with package `live.streetlocal.cityrider`
- [ ] Download `google-services.json` → drop into `cityriders/android/app/`
- [ ] Verify FCM works: run `npm run cap:build:android` and check the log no longer says "Push Notifications won't work"
- [ ] Set `FCM_SERVICE_ACCOUNT_JSON` in `.env.local` (server-side push needs this; download from Firebase Console → Project Settings → Service Accounts)

---

## 3. Legal entity env vars — privacy/legal pages render placeholders without these

Currently empty in `.env.local`. Set in BOTH `.env.local` (local dev) AND Vercel project env (production). Variable names are already consumed by `src/lib/legal/entity.ts`:

```
NEXT_PUBLIC_LEGAL_ENTITY_NAME=PT Street Local Digital
NEXT_PUBLIC_LEGAL_ENTITY_NPWP=01.234.567.8-901.000
NEXT_PUBLIC_LEGAL_ENTITY_ADDRESS=Jl. Malioboro No. 123, Yogyakarta 55271
NEXT_PUBLIC_LEGAL_ENTITY_PSE_NUMBER=PSE-12345/IPK/2026
NEXT_PUBLIC_LEGAL_ENTITY_CONTACT_EMAIL=hello@streetlocal.live
```

- [ ] Replace placeholders with the real registered PT info
- [ ] Vercel: Settings → Environment Variables → add for Production + Preview
- [ ] Redeploy after setting

---

## 4. Play Console listing assets

- [ ] **App icon**: 512×512 PNG (Hi-res icon) — Play Console upload field
- [ ] **Feature graphic**: 1024×500 PNG
- [ ] **Phone screenshots**: 2–8 PNG/JPG, 1080×1920 or higher
  - Easiest: run the PWA on an Android emulator, screenshot the:
    1. Landing `/` (service tiles)
    2. `/cari` search results
    3. `/rent` rentals
    4. `/massage` therapists
    5. `/dashboard` driver
- [ ] **Short description** (80 chars max)
- [ ] **Full description** (4000 chars max) — write in Bahasa Indonesia + English
- [ ] **Categorization**: Travel & Local (primary)
- [ ] **Content rating**: complete the IARC questionnaire — answer honestly; massage may push to "Mature 17+" if any wording implies adult-only services

---

## 5. Data Safety form (Play Console)

Disclose every data type the app collects. Truthful answers based on the codebase:

| Data type | Collected? | Optional? | Why | Shared with 3rd party? |
|---|---|---|---|---|
| Phone number | Yes | No (required for SMS OTP) | Authentication | No |
| Email | Yes | Yes | Optional for account recovery | No |
| Precise location | Yes | Yes | Show nearby drivers + record driver online position | No — only between user and matched driver |
| Approximate location | Yes | No | Marketplace city detection | No |
| Photos | Yes | Yes | Profile image, KTP verification | No |
| Government IDs (KTP) | Yes | Yes | Driver / massage therapist verification | No — admin only |
| Crash logs | Yes | No | Sentry monitoring | Yes — Sentry (data processor) |

- [ ] Submit form

---

## 6. Sensitive permission justifications

Two permissions trigger Play's prominent-disclosure review. Have video / screenshots ready:

- [ ] **Background location** (`ACCESS_BACKGROUND_LOCATION`): driver online-mode shares position so customers see live distance. Show the in-app permission modal that explains this BEFORE the OS prompt fires.
- [ ] **Foreground service for location** (`FOREGROUND_SERVICE_LOCATION`): same justification.
- [ ] **Battery optimization opt-out** (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`): record screen showing the prompt + driver mode that requires it.

---

## 7. Submit

- [ ] Build: `npm run cap:release:android` (produces `android/app/build/outputs/bundle/release/app-release.aab`)
- [ ] Upload AAB to Play Console
- [ ] Fill store listing, data safety, content rating, screenshots, feature graphic
- [ ] Submit for review (typical turnaround 3–7 days)

---

## 8. Post-launch

- [ ] Set up Sentry production DSN (`SENTRY_DSN` env) to receive crash reports
- [ ] Increment `versionCode` AND `versionName` in `android/app/build.gradle` for every resubmit
- [ ] Enable R8 / minify in release (`minifyEnabled true`) once stable — smaller AAB
