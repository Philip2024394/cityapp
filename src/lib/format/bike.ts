import type { Bike } from '@/types/rider'

// "Honda BeAT 2023"
export function bikeTitle(b: Bike): string {
  return `${b.make} ${b.model} ${b.year}`
}

// "Honda BeAT 2023 · Hitam · Matic"
export function bikeFull(b: Bike): string {
  return `${b.make} ${b.model} ${b.year} · ${b.color} · ${cap(b.type)}`
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
