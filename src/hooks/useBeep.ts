'use client'
// Two synthesised audio patterns via Web Audio API — no audio file needed.
//
// play()   — gentle 2-tone chime for quote-inbox notifications (200ms)
// alarm()  — loud ascending alarm + vibration for INCOMING ORDER modal.
//            Repeats automatically every ~3s until stop() is called or
//            modal is dismissed. Forces user attention.

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext
  if (!AC) return null
  try { return new AC() } catch { return null }
}

let activeAlarm: { ctx: AudioContext; timer: ReturnType<typeof setInterval> } | null = null

export function useBeep() {
  // Gentle 2-tone arpeggio — for quiet notifications
  function play() {
    const ctx = getCtx()
    if (!ctx) return
    try {
      const tone = (freq: number, when: number, dur: number, gain = 0.32) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.connect(g); g.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        g.gain.setValueAtTime(0.0001, ctx.currentTime + when)
        g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + when + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur)
        osc.start(ctx.currentTime + when)
        osc.stop(ctx.currentTime + when + dur)
      }
      tone(880,  0,    0.16)
      tone(1320, 0.13, 0.20)
      setTimeout(() => ctx.close().catch(() => {}), 600)
    } catch { /* silent fail */ }
  }

  // LOUD alarm — ascending 4-tone arpeggio, near max gain, repeated.
  // Plus a vibration pattern. Intended for incoming-order modal so the
  // rider cannot miss it even with phone face-down.
  //
  // Returns a stop() function — caller MUST stop on dismiss or it'll
  // alarm forever.
  function alarm(): () => void {
    // If an alarm is already going, kill it first so we don't stack
    if (activeAlarm) {
      try { clearInterval(activeAlarm.timer); activeAlarm.ctx.close().catch(() => {}) } catch {}
      activeAlarm = null
    }

    const ctx = getCtx()
    if (!ctx) return () => {}

    const burst = () => {
      try {
        const t0 = ctx.currentTime
        const tone = (freq: number, when: number, dur: number, gain = 0.55) => {
          const osc = ctx.createOscillator()
          const g = ctx.createGain()
          osc.connect(g); g.connect(ctx.destination)
          osc.type = 'square'   // brighter, louder than sine
          osc.frequency.value = freq
          g.gain.setValueAtTime(0.0001, t0 + when)
          g.gain.exponentialRampToValueAtTime(gain, t0 + when + 0.015)
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + when + dur)
          osc.start(t0 + when)
          osc.stop(t0 + when + dur + 0.05)
        }
        // 4-tone rising — "ALERT ALERT ALERT"
        tone(880,  0,    0.18)
        tone(1175, 0.20, 0.18)
        tone(1397, 0.40, 0.18)
        tone(1760, 0.60, 0.24, 0.65)   // top, loudest

        // Haptic alarm on mobile
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([200, 80, 200, 80, 200, 80, 400])
        }
      } catch { /* silent fail */ }
    }

    burst()                                     // immediate
    const timer = setInterval(burst, 2800)      // re-burst every 2.8s
    activeAlarm = { ctx, timer }

    return () => {
      if (activeAlarm && activeAlarm.ctx === ctx) {
        clearInterval(activeAlarm.timer)
        ctx.close().catch(() => {})
        activeAlarm = null
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(0)
        }
      }
    }
  }

  return { play, alarm }
}
