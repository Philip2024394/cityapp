export type IkTransform = {
  width?: number       // pixels (logical, before DPR)
  height?: number
  quality?: number     // 1-100, default 80
  format?: 'auto' | 'webp' | 'avif' | 'jpg'  // default 'auto'
  dpr?: number         // device pixel ratio; if set, multiplies width/height
}

export function ikUrl(url: string, t: IkTransform = {}): string {
  // Only transform ImageKit URLs. Pass everything else through unchanged.
  if (!url || !url.startsWith('https://ik.imagekit.io/')) return url
  const parts: string[] = []
  parts.push(`f-${t.format ?? 'auto'}`)
  parts.push(`q-${t.quality ?? 80}`)
  if (t.width)  parts.push(`w-${Math.round(t.width * (t.dpr ?? 1))}`)
  if (t.height) parts.push(`h-${Math.round(t.height * (t.dpr ?? 1))}`)
  const trParam = `tr=${parts.join(',')}`
  // Re-use existing ? if present (e.g. ?updatedAt=...), otherwise start one.
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}${trParam}`
}
