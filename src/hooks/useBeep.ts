'use client'
// Synthesised quote-arrival chime — no audio file needed. Web Audio API.
// Two-note arpeggio: 880Hz (A5) → 1320Hz (E6), 280ms total. Pleasant, attention-grabbing.
export function useBeep() {
  function play() {
    if (typeof window === 'undefined') return
    type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }
    const AC = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext
    if (!AC) return
    try {
      const ctx = new AC()
      const tone = (freq: number, when: number, dur: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + when)
        gain.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + when + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur)
        osc.start(ctx.currentTime + when)
        osc.stop(ctx.currentTime + when + dur)
      }
      tone(880, 0,     0.16)
      tone(1320, 0.13, 0.20)
      setTimeout(() => ctx.close().catch(() => {}), 600)
    } catch {
      // No audio context — silent fail
    }
  }
  return { play }
}
