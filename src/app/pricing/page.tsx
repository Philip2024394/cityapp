'use client'
import { useState } from 'react'
import { Save, Info, Settings2 } from 'lucide-react'
import AppNav from '@/components/layout/AppNav'
import DashboardNav from '@/components/layout/DashboardNav'
import SuggestedPricingCard from '@/components/rider/SuggestedPricingCard'
import { MOCK_RIDERS } from '@/data/mockRiders'
import { idr } from '@/lib/format/idr'
import { quoteFare } from '@/lib/pricing/quote'
import type { ServiceType } from '@/types/rider'
import { SERVICE_ICONS, SERVICE_LABELS, SERVICE_SHORT } from '@/types/rider'

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
  const [perKm, setPerKm] = useState(ME.pricePerKm)
  const [minFee, setMinFee] = useState(ME.minFee)
  const [perServiceMode, setPerServiceMode] = useState(!!ME.servicePricing)

  // Per-service overrides — start pre-filled with the existing rider's
  // overrides if any, otherwise from base.
  const [services, setServices] = useState<Record<ServiceType, ServiceOverride>>(() => {
    const init: Record<ServiceType, ServiceOverride> = {} as Record<ServiceType, ServiceOverride>
    for (const s of ALL_SERVICES) {
      const o = ME.servicePricing?.[s]
      init[s] = {
        perKm:   o?.perKm  ?? ME.pricePerKm,
        minFee:  o?.minFee ?? ME.minFee,
        enabled: !!(o && (o.perKm !== undefined || o.minFee !== undefined)),
      }
    }
    return init
  })

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
      <main className="min-h-screen pb-32">
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
          <div className="card p-5 relative overflow-hidden">
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
                      <div className="text-[20px] leading-none">{SERVICE_ICONS[s]}</div>
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

          {/* Base sliders */}
          <Section title="Base rate (default for all services)">
            <div>
              <div className="text-[12px] text-dim uppercase tracking-wider font-extrabold mb-2">Quick preset</div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setPerKm(p.perKm); setMinFee(p.min) }}
                    className="card p-3"
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
          </Section>

          {/* Per-service toggle */}
          <button
            onClick={() => setPerServiceMode(v => !v)}
            className="card p-4 w-full text-left flex items-center justify-between transition"
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
                  <div key={s} className="card p-4"
                       style={sv.enabled ? { borderColor: 'rgba(250,204,21,0.25)' } : undefined}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[20px]">{SERVICE_ICONS[s]}</span>
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
                    {sv.enabled && (
                      <div className="space-y-3 pt-2 border-t border-line">
                        <SliderRow label="Price per km" value={sv.perKm}  min={1500} max={6000} step={100} format={idr} onChange={v => setSvc(s, 'perKm', v)} />
                        <SliderRow label="Minimum fee"  value={sv.minFee} min={5000} max={25000} step={500} format={idr} onChange={v => setSvc(s, 'minFee', v)} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Tip */}
          <div className="card p-4 bg-brand/5 border-brand/20 flex gap-3">
            <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <div className="text-[13px] text-ink/85 leading-relaxed">
              Yogya riders typically charge <strong className="text-brand">Rp 2.500/km</strong> with minimum <strong className="text-brand">Rp 10.000</strong>. Raise it if your area is far or you have a big box. Passenger rates are typically 20% higher than parcel.
            </div>
          </div>

          <button className="btn-primary w-full">
            <Save className="w-4 h-4" />
            Save pricing
          </button>
        </div>
      </main>
      <DashboardNav />
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
