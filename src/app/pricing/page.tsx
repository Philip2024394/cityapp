'use client'
import { useState } from 'react'
import { Save, Info, Settings2, StopCircle, Scale, RotateCcw } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import SuggestedPricingCard from '@/components/rider/SuggestedPricingCard'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { idr } from '@/lib/format/idr'
import { quoteFare } from '@/lib/pricing/quote'
import type { ServiceType } from '@/types/rider'
import { SERVICE_LABELS, SERVICE_SHORT } from '@/types/rider'

// Service tile imagery — same artwork used as the service buttons on
// the public landing page (IndoCitySellingPage). Keeps the dashboard
// + selling-page visual language consistent.
const SERVICE_IMAGES: Record<ServiceType, string> = {
  person: 'https://ik.imagekit.io/nepgaxllc/Untitleddasdas-removebg-preview.png',
  parcel: 'https://ik.imagekit.io/nepgaxllc/Untitledsddasd-removebg-preview.png?updatedAt=1779013880961',
  food:   'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2017,%202026,%2005_29_25%20PM.png?updatedAt=1779013783890',
  // TODO: replace with dedicated car-service hero art once founder provides one.
  car:    'https://ik.imagekit.io/nepgaxllc/Untitleddasdas-removebg-preview.png',
  // TODO: replace with dedicated bus / minibus hero art once founder provides one.
  bus:    'https://ik.imagekit.io/nepgaxllc/Untitleddasdas-removebg-preview.png',
}
import { legalMinPerKm, legalMinFare, SERVICE_REGULATION, suggestedPerKm, suggestedMinFee } from '@/lib/tariffs/zones'

const ME = MOCK_RIDERS[0]!

// City benchmarks — would come from server-side aggregation of rider_pricing
// in production. For Yogya MVP, these are reasonable based on local Gojek
// equivalent rates after the platform's 20% cut is added back.
const CITY_BENCHMARK = {
  averagePerKm: 2_500,
  averageMinFee: 10_000,
}

const PRESETS = [
  { label: 'Low',       perKm: 2000, min: 8000 },
  { label: 'Standard',  perKm: 2500, min: 10000 },
  { label: 'Premium',   perKm: 3500, min: 15000 },
]

const SAMPLE_DISTANCES = [1, 3, 5, 10]
const ALL_SERVICES: ServiceType[] = ['parcel', 'food', 'person']

type ServiceOverride = { perKm: number; minFee: number; enabled: boolean }

export default function PricingPage() {
  // Resolve legal-minimum per-km + min-fee for this driver's city
  // (KP 667/2022 + KP-DRJD 5201/2025). Only applies to passenger
  // (`person`) rides — parcel + food are NOT government-regulated, so
  // we use the same number as a market-rate suggestion but never call
  // it "legal minimum" for those.
  const lawPerKm  = legalMinPerKm(ME.city?.toLowerCase()) ?? 2_000
  const lawMinFee = legalMinFare(ME.city?.toLowerCase()) ?? 8_000

  const [perKm, setPerKm] = useState(ME.pricePerKm)
  const [minFee, setMinFee] = useState(ME.minFee)

  // True when both current values match the law minimum for this city.
  const isAtLawMinimum = perKm === lawPerKm && minFee === lawMinFee

  function resetToLaw() {
    setPerKm(lawPerKm)
    setMinFee(lawMinFee)
  }
  const [perServiceMode, setPerServiceMode] = useState(!!ME.servicePricing)
  const [pitstopEnabled, setPitstopEnabled] = useState(ME.pitstopFee !== undefined)
  const [pitstopFee, setPitstopFee] = useState(ME.pitstopFee ?? 5000)

  // Per-service overrides — start pre-filled with the existing rider's
  // overrides if any, otherwise with the platform's suggested minimum
  // for that service in this city (legal floor for passenger; market
  // research minimum for parcel/food).
  const citySlug = ME.city?.toLowerCase()
  const [services, setServices] = useState<Record<ServiceType, ServiceOverride>>(() => {
    const init: Record<ServiceType, ServiceOverride> = {} as Record<ServiceType, ServiceOverride>
    for (const s of ALL_SERVICES) {
      const o = ME.servicePricing?.[s]
      init[s] = {
        perKm:   o?.perKm  ?? suggestedPerKm(s, citySlug)   ?? ME.pricePerKm,
        minFee:  o?.minFee ?? suggestedMinFee(s, citySlug)  ?? ME.minFee,
        enabled: !!(o && (o.perKm !== undefined || o.minFee !== undefined)),
      }
    }
    return init
  })

  // Reset a single service's rates to the platform's suggested minimum.
  // Per service the basis differs: passenger = KP 667/2022 legal floor;
  // parcel + food = market-research-derived suggested minimums.
  function resetServiceToSuggested(s: ServiceType) {
    const sg = suggestedPerKm(s, citySlug)
    const sm = suggestedMinFee(s, citySlug)
    if (sg == null || sm == null) return
    setServices(prev => ({ ...prev, [s]: { ...prev[s], perKm: sg, minFee: sm } }))
  }

  function setSvc<K extends keyof ServiceOverride>(s: ServiceType, key: K, value: ServiceOverride[K]) {
    setServices(prev => ({ ...prev, [s]: { ...prev[s], [key]: value } }))
  }

  function effectiveRate(s: ServiceType): { perKm: number; minFee: number } {
    if (!perServiceMode || !services[s].enabled) return { perKm, minFee }
    return { perKm: services[s].perKm, minFee: services[s].minFee }
  }

  return (
    <>
      <AppNav />
      <main className="min-h-[100dvh] pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold">Your pricing</h1>
            <p className="text-muted text-[14px] mt-1">
              Set per-km rate and minimum fee. Use one rate for all, or set different rates per service.
            </p>
          </div>

          {/* Suggested pricing — compare your base rate vs city average */}
          <SuggestedPricingCard
            city={ME.city}
            cityAveragePerKm={CITY_BENCHMARK.averagePerKm}
            cityAverageMinFee={CITY_BENCHMARK.averageMinFee}
            yourPerKm={perKm}
            yourMinFee={minFee}
          />

          {/* Preview tiles — show effective price for each service @ 5km */}
          <div className="card-dark p-5 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-60"
                 style={{ background: 'radial-gradient(ellipse at top, rgba(250,204,21,0.18), transparent 60%)' }} />
            <div className="relative">
              <div className="text-[13px] text-dim uppercase tracking-wider font-extrabold mb-3">
                Fare preview · 5 km trip
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ALL_SERVICES.map(s => {
                  const r = effectiveRate(s)
                  const fare = quoteFare(5, { pricePerKm: r.perKm, minFee: r.minFee })
                  const overridden = perServiceMode && services[s].enabled
                  return (
                    <div key={s} className="bg-white/5 rounded-2xl p-3 text-center relative">
                      <img
                        src={SERVICE_IMAGES[s]}
                        alt={SERVICE_LABELS[s]}
                        className="w-12 h-12 mx-auto object-contain"
                        loading="lazy"
                      />
                      <div className="text-[13px] font-bold mt-1.5">{SERVICE_SHORT[s]}</div>
                      <div className="text-[15px] font-extrabold gradient-text mt-1">{idr(fare)}</div>
                      <div className="text-[12px] text-dim mt-1">{idr(r.perKm)}/km</div>
                      {overridden && (
                        <span className="absolute top-1.5 right-1.5 inline-block w-1.5 h-1.5 rounded-full bg-brand" title="Custom rate" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Legal-minimum reset card — appears only when the driver has
              moved off the KP 667/2022 floor. One tap to snap back. */}
          {!isAtLawMinimum && (
            <div
              className="card-dark p-4 flex items-center gap-3"
              style={{ borderColor: 'rgba(34,197,94,0.30)', background: 'rgba(34,197,94,0.06)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'rgba(34,197,94,0.18)' }}>
                <Scale className="w-5 h-5" style={{ color: '#22C55E' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] uppercase tracking-wider font-extrabold" style={{ color: '#22C55E' }}>
                  Tarif disarankan pemerintah
                </div>
                <div className="text-[13px] mt-0.5 leading-tight">
                  {idr(lawPerKm)}/km · min {idr(lawMinFee)} <span className="text-muted">— KP 667/2022 untuk {ME.city || 'zona kamu'}</span>
                </div>
              </div>
              <button
                onClick={resetToLaw}
                className="shrink-0 px-3 py-2 rounded-xl font-extrabold text-[12px] active:scale-95 transition flex items-center gap-1.5"
                style={{ background: '#22C55E', color: '#0A0A0A', minHeight: 44 }}
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
                Pakai tarif disarankan
              </button>
            </div>
          )}

          {/* Base sliders */}
          <Section title="Base rate (default for all services)">
            <div>
              <div className="text-[12px] text-dim uppercase tracking-wider font-extrabold mb-2">Quick preset</div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setPerKm(p.perKm); setMinFee(p.min) }}
                    className="card-dark p-3"
                  >
                    <div className="text-[13px] font-extrabold">{p.label}</div>
                    <div className="text-brand text-[12px] mt-1">{idr(p.perKm)}/km</div>
                    <div className="text-dim text-[11px]">min {idr(p.min)}</div>
                  </button>
                ))}
              </div>
            </div>
            <SliderRow label="Price per kilometre" value={perKm}  min={1500} max={6000} step={100} format={idr} onChange={setPerKm} />
            <SliderRow label="Minimum fee"         value={minFee} min={5000} max={25000} step={500} format={idr} onChange={setMinFee} />
            <p className="text-[12px] text-dim leading-relaxed">
              Legal minimum for {ME.city || 'your zone'}: <span className="text-ink font-bold">{idr(lawPerKm)}/km</span> · min <span className="text-ink font-bold">{idr(lawMinFee)}</span> ({SERVICE_REGULATION.person.basis}).
              Parcel + food rates are not government-regulated — set them as you like.
            </p>
          </Section>

          {/* Per-service toggle */}
          <button
            onClick={() => setPerServiceMode(v => !v)}
            className="card-dark p-4 w-full text-left flex items-center justify-between transition"
            style={{
              borderColor: perServiceMode ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.06)',
              background: perServiceMode ? 'rgba(250,204,21,0.04)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: perServiceMode ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.05)' }}
              >
                <Settings2 className="w-4 h-4 text-brand" />
              </div>
              <div>
                <div className="font-extrabold text-[15px]">Set different rates per service</div>
                <div className="text-[13px] text-muted mt-0.5">
                  {perServiceMode ? 'Active — set custom rates for Passenger / Parcel / Food' : 'Use one base rate for all services'}
                </div>
              </div>
            </div>
            <div className="w-12 h-7 rounded-full p-0.5 transition shrink-0"
                 style={{ background: perServiceMode ? '#22C55E' : 'rgba(255,255,255,0.12)' }}>
              <div className="w-6 h-6 rounded-full bg-white transition-transform"
                   style={{ transform: perServiceMode ? 'translateX(20px)' : 'translateX(0)' }} />
            </div>
          </button>

          {/* Per-service rate cards (visible only when toggle is on) */}
          {perServiceMode && (
            <div className="space-y-3 animate-[fadeUp_0.4s_ease-out_both]">
              {ALL_SERVICES.map(s => {
                const sv = services[s]
                return (
                  <div key={s} className="card-dark p-4"
                       style={sv.enabled ? { borderColor: 'rgba(250,204,21,0.25)' } : undefined}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={SERVICE_IMAGES[s]}
                          alt=""
                          className="w-8 h-8 object-contain shrink-0"
                          loading="lazy"
                        />
                        <div>
                          <div className="font-extrabold text-[15px]">{SERVICE_LABELS[s]}</div>
                          <div className="text-[12px] text-muted">
                            {sv.enabled ? 'Custom rate active' : `Uses base rate (${idr(perKm)}/km · min ${idr(minFee)})`}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSvc(s, 'enabled', !sv.enabled)}
                        className="w-12 h-7 rounded-full p-0.5 transition shrink-0"
                        style={{ background: sv.enabled ? '#22C55E' : 'rgba(255,255,255,0.12)' }}
                        aria-label={`Toggle ${SERVICE_LABELS[s]} custom rate`}
                      >
                        <div className="w-6 h-6 rounded-full bg-white transition-transform"
                             style={{ transform: sv.enabled ? 'translateX(20px)' : 'translateX(0)' }} />
                      </button>
                    </div>
                    {sv.enabled && (() => {
                      const suggestedKm  = suggestedPerKm(s, citySlug)
                      const suggestedMin = suggestedMinFee(s, citySlug)
                      const isAtSuggested = suggestedKm != null && suggestedMin != null
                        && sv.perKm === suggestedKm && sv.minFee === suggestedMin
                      const label = s === 'person' ? 'Reset to legal min' : 'Reset to suggested'
                      const basis = SERVICE_REGULATION[s].basis
                      return (
                        <div className="space-y-3 pt-2 border-t border-line">
                          <SliderRow label="Price per km" value={sv.perKm}  min={1500} max={6000} step={100} format={idr} onChange={v => setSvc(s, 'perKm', v)} />
                          <SliderRow label="Minimum fee"  value={sv.minFee} min={5000} max={25000} step={500} format={idr} onChange={v => setSvc(s, 'minFee', v)} />
                          {suggestedKm != null && suggestedMin != null && (
                            <div className="flex items-center gap-2 pt-1">
                              <span className="flex-1 text-[12px] text-muted leading-relaxed">
                                Suggested for {ME.city || 'your zone'}: <span className="text-ink font-bold">{idr(suggestedKm)}/km</span> · min <span className="text-ink font-bold">{idr(suggestedMin)}</span>. {basis}.
                              </span>
                              {!isAtSuggested && (
                                <button
                                  type="button"
                                  onClick={() => resetServiceToSuggested(s)}
                                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-extrabold transition active:scale-95"
                                  style={{
                                    background: 'rgba(34,197,94,0.10)',
                                    border: '1px solid rgba(34,197,94,0.30)',
                                    color: '#22C55E',
                                    minHeight: 36,
                                  }}
                                >
                                  <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
                                  {label}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          )}

          {/* PIT-STOP FEE — separate from per-km rate */}
          <button
            onClick={() => setPitstopEnabled(v => !v)}
            className="card-dark p-4 w-full text-left flex items-center justify-between transition"
            style={{
              borderColor: pitstopEnabled ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.06)',
              background:  pitstopEnabled ? 'rgba(250,204,21,0.04)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: pitstopEnabled ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.05)' }}
              >
                <StopCircle className="w-4 h-4 text-brand" />
              </div>
              <div>
                <div className="font-extrabold text-[15px]">Offer pit-stop service</div>
                <div className="text-[13px] text-muted mt-0.5">
                  {pitstopEnabled
                    ? `Active — ${pitstopFee === 0 ? 'free' : `${idr(pitstopFee)} per stop`}`
                    : "You won't appear when customers request a pit stop"}
                </div>
              </div>
            </div>
            <div className="w-12 h-7 rounded-full p-0.5 transition shrink-0"
                 style={{ background: pitstopEnabled ? '#22C55E' : 'rgba(255,255,255,0.12)' }}>
              <div className="w-6 h-6 rounded-full bg-white transition-transform"
                   style={{ transform: pitstopEnabled ? 'translateX(20px)' : 'translateX(0)' }} />
            </div>
          </button>

          {pitstopEnabled && (
            <div className="card-dark p-4 animate-[fadeUp_0.3s_ease-out_both]" style={{ borderColor: 'rgba(250,204,21,0.25)' }}>
              <SliderRow
                label="Pit-stop fee"
                value={pitstopFee}
                min={0} max={25000} step={500}
                format={(n) => n === 0 ? 'Free' : idr(n)}
                onChange={setPitstopFee}
              />
              <p className="text-[12px] text-dim mt-3 leading-relaxed">
                💡 What you charge to make a brief stop along the way (warung, ATM, etc.). Item costs are handled separately — customer transfers you via GoPay/QRIS before you buy.
              </p>
            </div>
          )}

          {/* Tip */}
          <div className="card-dark p-4 border-brand/20 flex gap-3">
            <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <div className="text-[13px] text-ink/85 leading-relaxed">
              Yogya riders typically charge <strong className="text-brand">Rp 2.500/km</strong> with minimum <strong className="text-brand">Rp 10.000</strong>. Raise it if your area is far or you have a big box. Passenger rates are typically 20% higher than parcel. Pit-stop fees usually Rp 3-10K.
            </div>
          </div>

          <button className="btn-primary w-full">
            <Save className="w-4 h-4" />
            Save pricing
          </button>
        </div>
      </main>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-muted">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function SliderRow({
  label, value, min, max, step, format, onChange,
}: {
  label: string
  value: number
  min: number; max: number; step: number
  format: (n: number) => string
  onChange: (n: number) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="label !mb-0">{label}</label>
        <div className="text-brand font-extrabold text-lg">{format(value)}</div>
      </div>
      <input
        type="range"
        value={value}
        min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#FACC15] h-2"
      />
      <div className="flex justify-between text-[11px] text-dim mt-1.5">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}
