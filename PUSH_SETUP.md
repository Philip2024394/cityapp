# Push Notifications — Setup Checklist

The driver's phone plays a loud 10-second alarm-style sound the instant a
customer taps Contact on `/business` or `/cari/rider`. This document
covers the one-time setup so the system actually delivers in production.

Architecture:

```
Customer taps Contact
        ↓
POST /api/contact/ping  ──→  driver_contact_pings row created
        ↓
sendDriverPush()        ──→  FCM HTTP v1
        ↓
Google Cloud Messaging  ──→  Driver's Android phone
        ↓
@capacitor/push-notifications plugin
        ↓
"bookings" channel (HIGH importance + booking_ding.mp3)
        ↓
10-second loud alert + heads-up + lock-screen popup
        ↓
Driver taps the notification
        ↓
attachPushTapHandler → /alert?pingId=… → ack recorded → Open WhatsApp
```

---

## 1. Firebase project (one-time, 10 min)

1. Go to https://console.firebase.google.com and create a project named
   `cityriders` (or similar).
2. In the Firebase console, **Project Settings → General → Your apps**:
   add an **Android** app with package name `live.streetlocal.cityrider`
   (must match `android/app/build.gradle` `applicationId` and
   `capacitor.config.ts` `appId`). Using any other package name will
   cause FCM to silently reject every token — push will not deliver.
3. Download `google-services.json` and drop it at
   `android/app/google-services.json`.
4. Firebase auto-enables Cloud Messaging on app creation; no extra step.

## 2. Service account credentials (one-time)

1. **Project Settings → Service Accounts → Generate new private key**.
2. Open the downloaded JSON, copy the entire file content.
3. Paste it as a SINGLE-LINE env var in Vercel (Project → Settings →
   Environment Variables):
   - Name: `FCM_SERVICE_ACCOUNT_JSON`
   - Value: the entire JSON (Vercel handles multiline)
   - Environments: Production + Preview + Development
4. Locally: add the same to `.env.local` (do NOT commit).

Sanity check — when the env is set, the server can mint OAuth2 tokens
for FCM. Without it, `sendDriverPush()` returns
`{ sent: 0, skippedReason: 'fcm_not_configured' }` and the system is a
no-op (does not break the Contact button).

## 3. Sound asset (one-time)

The 10-second loud sound is a file the Android app bundles:

- **Path:** `android/app/src/main/res/raw/booking_ding.mp3`
- **Length:** 8–12 seconds (loops are not needed — single file plays through)
- **Format:** MP3 or OGG, 44.1 kHz, mono is fine
- **Style:** delivery-app alarm (loud, distinctive, professional)

Where to get one:

1. **Free options:** mixkit.co, freesound.org (filter by license "CC0")
2. **Commission:** Fiverr custom (~$5) — request "delivery app booking alert sound, 10s, loud, alarm-style"
3. **DIY:** ElevenLabs / udio.com — generate a synthesized alert

After dropping the file in, run `npm run cap:sync` to copy it into the
APK build.

iOS only (when we add): the equivalent file lives at
`ios/App/App/booking_ding.caf` (Core Audio Format). Use afconvert to
convert: `afconvert booking_ding.mp3 booking_ding.caf -d ima4 -f caff -v`.

## 4. Install the Capacitor push plugin

Already added to `package.json`. Run:

```bash
npm install
npx cap sync android
```

This bundles `@capacitor/push-notifications@^8.0.2` into the APK.

## 5. Android Manifest — POST_NOTIFICATIONS permission (Android 13+)

Edit `android/app/src/main/AndroidManifest.xml`. Inside `<manifest>`,
above `<application>`:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

The plugin handles the runtime permission dialog itself on first
register — Android 13+ surfaces a system prompt.

## 6. Run the migrations

```bash
npx supabase db push --linked
```

Applies `0027_driver_push_tokens.sql` and `0028_driver_contact_pings.sql`.

## 7. Test the wiring locally (web)

Even without the native APK:

1. Sign in as a driver
2. Dashboard → toggle "Loud booking alerts" → ON
   - Without native plugin, the toggle still saves consent. The blue
     "Install Android app" hint appears.
3. Open another browser as a customer → /business → tap Contact on any
   driver card
4. Check Supabase: a new row appears in `driver_contact_pings`
5. Check Vercel logs: `sendDriverPush` runs with `skippedReason: 'no_tokens'`
   (expected — no real devices yet)

## 8. Test on a real Android device

1. `npm run cap:build:android` to produce an APK
2. Install on a physical Android phone, sign in
3. Toggle "Loud booking alerts" → ON (grants permission, registers token)
4. From another device, tap Contact on the driver's card on `/business`
5. The phone should:
   - Play `booking_ding.mp3` loudly
   - Show heads-up notification
   - Tap → opens `/alert?pingId=…` → ack recorded → "Open WhatsApp" button works

## 9. Play Store submission notes

When submitting:

- **Data Safety form:** declare push token collection under "App activity
  → In-app actions" with purpose "Account management"
- **Permissions justification:** "POST_NOTIFICATIONS is used to alert
  drivers of incoming customer booking requests in real time"
- **Notification channel name** ("Booking alerts") and description are
  shown to users in Settings — already filled in `pushChannel.ts`

## Failure modes (and what happens)

| Failure | What the user sees | Self-heals? |
|---|---|---|
| FCM env not set | Toggle works, but no push delivered | Yes — fix env and redeploy |
| Driver did not grant notification permission | Error shown in toggle UI | Yes — driver retries from toggle |
| Driver uninstalled the app | Token returns 404 from FCM | Yes — server prunes dead tokens automatically |
| Phone offline at moment of ping | FCM queues for ~120s (our TTL) | Yes — delivered when phone reconnects |
| Driver disabled the channel in Android settings | No sound but notification still appears | Driver re-enables in OS settings |
| `booking_ding.mp3` missing from APK | Falls back to default notification sound (short ding) | No — must rebuild APK with the file |
