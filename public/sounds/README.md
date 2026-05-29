# /public/sounds

Audio assets used by client components.

## booking-alert.mp3

Looping alert played by `BookingAlertProvider` when a customer taps a
driver's WhatsApp button on `/cari`, `/r/[slug]`, or `/car/[slug]`.

**File name (must match exactly):** `booking-alert.mp3`

**Recommended characteristics:**
- 1–3 seconds long (it loops)
- Loud, attention-getting, distinct from generic ringtones
- MP3 192–256 kbps mono is plenty
- Peak normalised to ~-1 dBFS so it cuts through ambient noise
- Branded (yellow/charcoal vibe)

Until the real file is dropped here, the audio element will 404 silently
— the popup + vibrate still fire, just without sound. Drop the file at
`public/sounds/booking-alert.mp3` and it picks up immediately.
