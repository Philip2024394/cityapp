'use client'
import { useEffect, useState } from 'react'
import { Camera, Save, Phone, Box, Loader2, Check } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import LocationPicker, { type LocationPickerValue } from '@/components/rider/LocationPicker'
import BikePicker from '@/components/rider/BikePicker'
import BikeColorPicker from '@/components/rider/BikeColorPicker'
import { getBikeImageUrl, isExactBikeImage } from '@/data/bikeImages'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { fetchMyDriverBrowser } from '@/lib/drivers/queries'
import { getBrowserSupabase } from '@/lib/supabase/client'
import type { Rider } from '@/types/rider'

const FALLBACK_ME = MOCK_RIDERS[0]!

export default function ProfilePage() {
  const [me, setMe] = useState<Rider>(FALLBACK_ME)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState(formFromRider(FALLBACK_ME))
  const [location, setLocation] = useState<LocationPickerValue | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Hydrate from Supabase once mounted
  useEffect(() => {
    let cancelled = false
    fetchMyDriverBrowser().then((r) => {
      if (cancelled) return
      if (r) {
        setMe(r)
        setForm(formFromRider(r))
      }
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    setError(null)
    setSavedAt(null)
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setError('Auth not configured.')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not signed in.')
      return
    }
    setSaving(true)
    // If the driver picked a fresh location, persist the admin IDs +
    // service-zone centroid alongside the human-readable area/city text.
    // If no fresh pick (they just edited name etc.) keep existing values.
    const locUpdate = location
      ? {
          area:                    location.area_label || form.area.trim(),
          city:                    location.city_label || form.city.trim(),
          service_zone_center_lat: location.lat,
          service_zone_center_lng: location.lng,
          province_id:             location.province_id,
          regency_id:              location.regency_id,
          district_id:             location.district_id,
          village_id:              location.village_id,
        }
      : {
          area: form.area.trim(),
          city: form.city.trim(),
        }

    const { error } = await supabase
      .from('drivers')
      .update({
        business_name: form.name.trim(),
        whatsapp_e164: form.whatsapp.trim(),
        bio: form.bio.trim(),
        ...locUpdate,
        bike_make: form.bikeMake.trim(),
        bike_model: form.bikeModel.trim(),
        bike_year: form.bikeYear,
        bike_color: form.bikeColor.trim(),
        bike_type: form.bikeType,
        bike_plate: form.plate.trim() || null,
        has_box: form.hasBox,
      })
      .eq('user_id', user.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSavedAt(Date.now())
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
          <h1 className="text-2xl font-extrabold">Profile & Bike</h1>

          {/* Photo */}
          <div className="card-dark p-5 flex items-center gap-4">
            <div className="relative shrink-0">
              <img src={me.photoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover" />
              <button className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-brand text-bg flex items-center justify-center shadow-glow">
                <Camera className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
            <div>
              <div className="text-[13px] text-muted">Rider photo</div>
              <div className="font-bold mt-0.5">Tap the camera to change</div>
              <div className="text-[12px] text-dim mt-1">Must be clear, JPG/PNG, min 400px</div>
            </div>
          </div>

          {/* Identity */}
          <Section title="Identity">
            <Field label="Business name">
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="WhatsApp (E.164)" hint="Number customers will use to contact you — start with 62">
              <div className="relative">
                <Phone className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                <input className="input pl-11 font-mono" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
              </div>
            </Field>
            <Field label="Bio" hint="Maximum 200 characters">
              <textarea className="input" rows={3} value={form.bio} onChange={(e) => set('bio', e.target.value)} maxLength={200} />
            </Field>
          </Section>

          {/* Service area — auto-resolved from GPS, no free-text input.
              Picker resolves to full Indonesia admin chain (province →
              regency → district → village) via /api/geo/admin-lookup. */}
          <Section title="Service area">
            <LocationPicker
              value={location ?? (form.area || form.city
                ? null  // existing free-text only — show GPS prompt to upgrade
                : null)}
              onChange={(v) => {
                setLocation(v)
                // Keep the legacy free-text fields in sync for any
                // downstream code still reading them.
                set('area', v.area_label)
                set('city', v.city_label)
              }}
            />
            {(form.area || form.city) && !location && (
              <div className="text-[12px] text-muted leading-relaxed pt-1">
                Currently set: <span className="text-ink font-bold">{form.area}</span>
                {form.city && <>, <span className="text-ink font-bold">{form.city}</span></>}.
                Tap above to update with precise GPS.
              </div>
            )}
          </Section>

          {/* Bike */}
          <Section title="Bike">
            {/* Preview — visual feedback on what customers will see for
                the chosen bike. Falls back to a generic silhouette when
                the catalog has no match. */}
            {(form.bikeMake || form.bikeModel) && (
              <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <img
                  src={getBikeImageUrl(form.bikeMake, form.bikeModel)}
                  alt=""
                  className="w-16 h-16 rounded-xl object-contain shrink-0"
                  style={{ background: 'rgba(0,0,0,0.25)' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] uppercase tracking-wider font-extrabold text-dim">
                    {isExactBikeImage(form.bikeMake, form.bikeModel) ? 'Bike photo on file' : 'Generic preview'}
                  </div>
                  <div className="font-extrabold text-[14px] mt-0.5 truncate">
                    {form.bikeMake} {form.bikeModel}{form.bikeYear ? ` · ${form.bikeYear}` : ''}
                  </div>
                  {!isExactBikeImage(form.bikeMake, form.bikeModel) && (
                    <div className="text-[12px] text-muted mt-0.5 leading-tight">
                      No stock photo yet — customers see the silhouette. Upload a real photo on /dashboard/rentals if you rent this bike.
                    </div>
                  )}
                </div>
              </div>
            )}
            <BikePicker
              make={form.bikeMake}
              model={form.bikeModel}
              onChange={({ make, model }) => {
                set('bikeMake', make)
                set('bikeModel', model)
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year">
                <input
                  className="input"
                  type="number"
                  min={2000}
                  max={new Date().getFullYear() + 1}
                  value={form.bikeYear}
                  onChange={(e) => set('bikeYear', parseInt(e.target.value, 10) || form.bikeYear)}
                />
              </Field>
              <div>
                <BikeColorPicker
                  label="Colour"
                  value={form.bikeColor}
                  onChange={(v) => set('bikeColor', v)}
                />
              </div>
            </div>
            <Field label="Type">
              <div className="grid grid-cols-3 gap-2">
                {(['matic', 'sport', 'manual'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => set('bikeType', t)}
                    className="px-3 py-3 rounded-xl border text-[13px] font-bold capitalize transition"
                    style={{
                      background: form.bikeType === t ? '#FACC15' : 'rgba(255,255,255,0.04)',
                      color: form.bikeType === t ? '#0A0A0A' : 'rgba(255,255,255,0.8)',
                      borderColor: form.bikeType === t ? '#FACC15' : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Plate number (optional)">
              <input className="input font-mono" placeholder="AB 1234 XX" value={form.plate} onChange={(e) => set('plate', e.target.value)} />
            </Field>
            <Field label="Delivery box">
              <button
                onClick={() => set('hasBox', !form.hasBox)}
                className="card-dark p-4 flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Box className="w-5 h-5 text-brand" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-[14px]">Has a parcel box</div>
                    <div className="text-[12px] text-muted">Important for large parcels</div>
                  </div>
                </div>
                <div
                  className="w-12 h-7 rounded-full p-0.5 transition"
                  style={{ background: form.hasBox ? '#22C55E' : 'rgba(255,255,255,0.12)' }}
                >
                  <div
                    className="w-6 h-6 rounded-full bg-white transition-transform"
                    style={{ transform: form.hasBox ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </div>
              </button>
            </Field>
          </Section>

          {error && <p className="text-[13px] text-red-400">{error}</p>}
          {savedAt && <p className="text-[13px] text-online inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Saved</p>}

          <button onClick={save} disabled={saving || !loaded} className="btn-primary w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </main>
      <DashboardNav />
    </>
  )
}

function formFromRider(r: Rider) {
  return {
    name: r.name,
    whatsapp: r.whatsappE164,
    bio: r.bio,
    area: r.area,
    city: r.city,
    bikeMake: r.bike.make,
    bikeModel: r.bike.model,
    bikeYear: r.bike.year,
    bikeColor: r.bike.color,
    bikeType: r.bike.type,
    plate: r.bike.plate ?? '',
    hasBox: r.bike.hasBox,
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-dark p-5 space-y-4">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-muted">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[12px] text-dim mt-1.5">{hint}</p>}
    </div>
  )
}
