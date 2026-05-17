'use client'
import { useState } from 'react'
import { MapPin, ArrowDown, Crosshair } from 'lucide-react'
import type { GeoPoint } from '@/hooks/useGeolocation'

type Props = {
  pickup: GeoPoint | null
  dropoff: GeoPoint | null
  pickupLabel?: string
  dropoffLabel?: string
  onUseMyLocation: () => void
  onPickupLabelChange: (s: string) => void
  onDropoffLabelChange: (s: string) => void
  onChooseDropoffOnMap?: () => void
  status: 'idle' | 'requesting' | 'granted' | 'denied'
}

export default function PickupDropoffPicker({
  pickup, dropoff, pickupLabel, dropoffLabel,
  onUseMyLocation, onPickupLabelChange, onDropoffLabelChange,
  onChooseDropoffOnMap, status,
}: Props) {
  return (
    <div className="card p-4">
      {/* Pickup row */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-3">
          <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-glow" />
          <div className="w-px h-8 bg-line my-1" />
          <div className="w-2.5 h-2.5 rounded-sm bg-online" />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <div className="label text-[12px] mb-1.5 flex items-center justify-between">
              <span>Pick up</span>
              <button
                onClick={onUseMyLocation}
                className="text-brand text-[12px] font-bold flex items-center gap-1 normal-case tracking-normal"
              >
                <Crosshair className="w-3 h-3" />
                {status === 'requesting' ? 'Searching…' : 'My location'}
              </button>
            </div>
            <input
              className="input"
              placeholder={pickup ? 'Set — name the place (optional)' : 'Tap "My location" or type the address'}
              value={pickupLabel ?? ''}
              onChange={e => onPickupLabelChange(e.target.value)}
            />
            {pickup && (
              <div className="text-[12px] text-dim mt-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)} · ±{Math.round(pickup.accuracyM)}m
              </div>
            )}
          </div>
          <div>
            <div className="label text-[12px] mb-1.5 flex items-center justify-between">
              <span>Drop off</span>
              {onChooseDropoffOnMap && (
                <button
                  onClick={onChooseDropoffOnMap}
                  className="text-brand text-[12px] font-bold flex items-center gap-1 normal-case tracking-normal"
                >
                  <ArrowDown className="w-3 h-3" />
                  Pick on map
                </button>
              )}
            </div>
            <input
              className="input"
              placeholder="Destination address"
              value={dropoffLabel ?? ''}
              onChange={e => onDropoffLabelChange(e.target.value)}
            />
            {dropoff && (
              <div className="text-[12px] text-dim mt-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {dropoff.lat.toFixed(4)}, {dropoff.lng.toFixed(4)}
              </div>
            )}
          </div>
        </div>
      </div>

      {status === 'denied' && (
        <div className="mt-3 p-3 rounded-xl bg-danger/10 border border-danger/30 text-[13px] text-danger">
          GPS denied. Drag the pin on the map or type the address manually.
        </div>
      )}
    </div>
  )
}
