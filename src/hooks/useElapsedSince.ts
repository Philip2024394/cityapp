'use client'
import { useEffect, useState } from 'react'

// useElapsedSince — ticks once per second while the tab is visible, so
// callers can render a live "X min Y sec ago" counter without owning
// their own interval. Returns 0 if startMs is null.
//
// Pauses on hidden tabs (browser auto-throttles intervals to 1/min
// anyway). Resumes on visibility change and ticks immediately so the
// returning-from-WhatsApp moment shows a fresh number.
export function useElapsedSince(startMs: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startMs == null) return
    let interval: ReturnType<typeof setInterval> | null = null

    function start() {
      setNow(Date.now())
      if (interval) clearInterval(interval)
      interval = setInterval(() => setNow(Date.now()), 1000)
    }
    function stop() {
      if (interval) { clearInterval(interval); interval = null }
    }
    function onVis() {
      if (document.visibilityState === 'visible') start()
      else stop()
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [startMs])

  return startMs == null ? 0 : Math.max(0, now - startMs)
}
