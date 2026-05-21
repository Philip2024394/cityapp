// Starter bike catalog — common Indonesian rental motorbikes with their
// stock photos hosted on the project's ImageKit account. Used by the
// /rent/list/new carousel: tapping a card auto-fills brand / model /
// cc / transmission / type / image. Owner can still override every
// field after selecting.
//
// Expand this list as more bike photos are added. Gaps to fill before
// "full Indonesia coverage" are documented at the bottom of this file.

import type { Transmission } from './types'

export type CatalogBike = {
  id: string
  brand: string
  model: string
  cc: number
  transmission: Transmission
  bikeType: 'matic' | 'bebek' | 'sport' | 'adventure' | 'big_bike' | 'classic' | 'vespa' | 'electric'
  imageUrl: string
  aliases?: string[]
}

export const BIKE_CATALOG: CatalogBike[] = [
  // ─── SPORT (5) ──────────────────────────────────────────────────
  {
    id: 'honda-cb150r',
    brand: 'Honda', model: 'CB150R Streetfire',
    cc: 150, transmission: 'manual', bikeType: 'sport',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledasdss23asdaasdaasdassasaasdasdasdaasdassdfsdfasd-removebg-preview.png?updatedAt=1776331088193',
    aliases: ['cb150', 'streetfire', 'cb 150'],
  },
  {
    id: 'suzuki-gsx-r150',
    brand: 'Suzuki', model: 'GSX-R150',
    cc: 150, transmission: 'manual', bikeType: 'sport',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledasdss23asdaasdaasdassasaasdasdasdaasdassdf-removebg-preview.png?updatedAt=1776331028072',
    aliases: ['gsxr150', 'gsx-r', 'gsxr 150', 'gsx r'],
  },
  {
    id: 'yamaha-r15',
    brand: 'Yamaha', model: 'R15 V3',
    cc: 155, transmission: 'manual', bikeType: 'sport',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledasdss23asdaasdaasdas-removebg-preview.png?updatedAt=1776330546701',
    aliases: ['r15', 'yzf r15', 'r-15'],
  },
  {
    id: 'honda-cbr150r',
    brand: 'Honda', model: 'CBR150R',
    cc: 150, transmission: 'manual', bikeType: 'sport',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledasdss23asdaasda-removebg-preview.png?updatedAt=1776330435858',
    aliases: ['cbr150', 'cbr 150'],
  },
  {
    id: 'kawasaki-ninja-250',
    brand: 'Kawasaki', model: 'Ninja 250',
    cc: 250, transmission: 'manual', bikeType: 'sport',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/mm11sfdfdd-removebg-preview.png?updatedAt=1776102249211',
    aliases: ['ninja', 'ninja250', 'ninja 250'],
  },

  // ─── ADVENTURE (3) ──────────────────────────────────────────────
  {
    id: 'kawasaki-klx-150',
    brand: 'Kawasaki', model: 'KLX 150',
    cc: 150, transmission: 'manual', bikeType: 'adventure',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledasdss23asdaasdaasdassasaasdasdasdaasdas-removebg-preview.png?updatedAt=1776330845098',
    aliases: ['klx', 'klx150', 'trail', 'dirt'],
  },
  {
    id: 'honda-crf-150l',
    brand: 'Honda', model: 'CRF150L',
    cc: 150, transmission: 'manual', bikeType: 'adventure',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledasdss23asdaasdaasdassasaasdasd-removebg-preview.png?updatedAt=1776330747136',
    aliases: ['crf', 'crf150', 'crf 150', 'trail'],
  },
  {
    id: 'kawasaki-versys-x-250',
    brand: 'Kawasaki', model: 'Versys-X 250',
    cc: 250, transmission: 'manual', bikeType: 'adventure',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/mm11sfdfdddsd-removebg-preview.png?updatedAt=1776102436462',
    aliases: ['versys', 'versys x', 'versys-x'],
  },

  // ─── VESPA (2) ──────────────────────────────────────────────────
  {
    id: 'vespa-primavera',
    brand: 'Vespa', model: 'Primavera 150',
    cc: 150, transmission: 'automatic', bikeType: 'vespa',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledasdss23asdaasdaasdassasaasdasdasdaasdas-removebg-preview.png?updatedAt=1776330936257',
    aliases: ['vespa', 'primavera', 'piaggio', 'classic vespa'],
  },
  {
    id: 'vespa-px',
    brand: 'Vespa', model: 'PX 150',
    cc: 150, transmission: 'manual', bikeType: 'vespa',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/mm11sfdfdddsddsfsdf-removebg-preview.png?updatedAt=1776102499535',
    aliases: ['vespa px', 'px150', 'classic vespa', 'vespa classic'],
  },

  // ─── CLASSIC (2) ────────────────────────────────────────────────
  {
    id: 'royal-enfield-interceptor-650',
    brand: 'Royal Enfield', model: 'Interceptor 650',
    cc: 648, transmission: 'manual', bikeType: 'classic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/mm11sfdfdddsddsfsdfdsddasdas-removebg-preview.png?updatedAt=1776102744981',
    aliases: ['royal enfield', 'interceptor', 're', 'enfield'],
  },
  {
    id: 'yamaha-xsr-155',
    brand: 'Yamaha', model: 'XSR 155',
    cc: 155, transmission: 'manual', bikeType: 'classic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/mm11sf-removebg-preview.png?updatedAt=1776101864381',
    aliases: ['xsr', 'xsr155', 'xsr 155'],
  },

  // ─── BIG BIKE (2) ───────────────────────────────────────────────
  {
    id: 'kawasaki-ninja-400',
    brand: 'Kawasaki', model: 'Ninja 400',
    cc: 399, transmission: 'manual', bikeType: 'big_bike',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2012_24_25%20AM.png',
    aliases: ['ninja 400', 'ninja400', 'krt'],
  },
  {
    id: 'harley-davidson-heritage',
    brand: 'Harley-Davidson', model: 'Heritage Softail',
    cc: 1450, transmission: 'manual', bikeType: 'big_bike',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/mm11sfdfdddsddsfsdfdsd-removebg-preview.png?updatedAt=1776102622618',
    aliases: ['harley', 'hd', 'softail', 'heritage'],
  },

  // ─── ELECTRIC (2) ───────────────────────────────────────────────
  // Battery EVs. cc is stored as the rated power proxy (cc-equivalent)
  // so the existing rental card spec strip still renders; UI can swap
  // the label to "Electric" via bikeType.
  {
    id: 'honda-em1-e',
    brand: 'Honda', model: 'EM1 e:',
    cc: 50, transmission: 'automatic', bikeType: 'electric',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2012_15_49%20AM.png',
    aliases: ['em1', 'em1 e', 'honda em1', 'honda electric', 'em1e'],
  },
  {
    id: 'selis-e-max',
    brand: 'Selis', model: 'E-Max',
    cc: 50, transmission: 'automatic', bikeType: 'electric',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2012_17_48%20AM.png',
    aliases: ['selis', 'e-max', 'emax', 'selis emax', 'selis electric'],
  },

  // ─── BEBEK / UNDERBONE (2) ──────────────────────────────────────
  // Manual underbone — cheap, fuel-efficient. Workhorse of Indonesian
  // local renters and the go-to choice for delivery workers without
  // their own bike.
  {
    id: 'honda-supra-x-125',
    brand: 'Honda', model: 'Supra X 125',
    cc: 125, transmission: 'manual', bikeType: 'bebek',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2012_11_29%20AM.png',
    aliases: ['supra', 'supra x', 'supra x125', 'supra 125'],
  },
  {
    id: 'yamaha-vega-r',
    brand: 'Yamaha', model: 'Vega Force',
    cc: 115, transmission: 'manual', bikeType: 'bebek',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2012_13_56%20AM.png',
    aliases: ['vega', 'vega r', 'vega force', 'yamaha vega'],
  },

  // ─── MATIC (10) ─────────────────────────────────────────────────
  {
    id: 'yamaha-nmax-155',
    brand: 'Yamaha', model: 'NMAX 155',
    cc: 155, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/mm11-removebg-preview.png?updatedAt=1776101563522',
    aliases: ['nmax', 'n-max', 'nmax 155'],
  },
  {
    id: 'honda-pcx-150',
    brand: 'Honda', model: 'PCX 150',
    cc: 150, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledsdfasdfdddfsdfsdsdfsdfadsasdadasdaadasdsadfsdsasdaasdasdadsasddasdasdasasdasadsdasdasdasdas-removebg-preview.png?updatedAt=1776101322497',
    aliases: ['pcx', 'pcx150', 'pcx 150'],
  },
  {
    id: 'honda-adv-160',
    brand: 'Honda', model: 'ADV 160',
    cc: 160, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/mm-removebg-preview.png?updatedAt=1776101447952',
    aliases: ['adv', 'adv160', 'adv 160', 'adventure scooter'],
  },
  {
    id: 'yamaha-aerox-155',
    brand: 'Yamaha', model: 'Aerox 155',
    cc: 155, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledasdss2-removebg-preview.png?updatedAt=1776330134465',
    aliases: ['aerox', 'aerox155', 'aerox 155'],
  },
  {
    id: 'yamaha-xmax-250',
    brand: 'Yamaha', model: 'X-Max 250',
    cc: 250, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/mm11s-removebg-preview.png?updatedAt=1776101715884',
    aliases: ['xmax', 'x-max', 'x max', 'xmax250'],
  },
  {
    id: 'honda-vario-160',
    brand: 'Honda', model: 'Vario 160',
    cc: 160, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledsdfasdfdddfsdfsdsdfsdfadsasdadasdaadasdsadfsdsasdaasdasdadsasddasdasdas-removebg-preview.png?updatedAt=1776100954578',
    aliases: ['vario 160', 'vario160'],
  },
  {
    id: 'honda-vario-125',
    brand: 'Honda', model: 'Vario 125',
    cc: 125, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledsdfasdfdddfsdfsdsdfsdfadsasdadasdaadasdsadfsdsasdaasdasdadsasddasd-removebg-preview.png?updatedAt=1776100590953',
    aliases: ['vario 125', 'vario125', 'vario'],
  },
  {
    id: 'honda-scoopy',
    brand: 'Honda', model: 'Scoopy',
    cc: 110, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledsdfasdfdddfsdfsdsdfsdfadsasdadasdaadasdsadfsdsasdaasdasdadsasddasdasdasasdas-removebg-preview.png?updatedAt=1776101014459',
    aliases: ['scoopy', 'honda scoopy'],
  },
  {
    id: 'honda-beat',
    brand: 'Honda', model: 'Beat',
    cc: 110, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledasdss23asda-removebg-preview.png?updatedAt=1776330337603',
    aliases: ['beat', 'beat sporty', 'honda beat', 'beat street'],
  },
  {
    id: 'yamaha-mio',
    brand: 'Yamaha', model: 'Mio M3',
    cc: 125, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/Untitledasdss23-removebg-preview.png?updatedAt=1776330209644',
    aliases: ['mio', 'mio m3', 'mio soul', 'soul gt'],
  },
  {
    id: 'yamaha-fazzio',
    brand: 'Yamaha', model: 'Fazzio',
    cc: 125, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/mm11sfdf-removebg-preview.png?updatedAt=1776102121505',
    aliases: ['fazzio', 'yamaha fazzio'],
  },
  {
    id: 'honda-stylo-160',
    brand: 'Honda', model: 'Stylo 160',
    cc: 160, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2012_20_20%20AM.png',
    aliases: ['stylo', 'stylo 160', 'stylo160', 'honda stylo'],
  },
  {
    id: 'yamaha-lexi',
    brand: 'Yamaha', model: 'Lexi 125',
    cc: 125, transmission: 'automatic', bikeType: 'matic',
    imageUrl: 'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2019,%202026,%2012_22_03%20AM.png',
    aliases: ['lexi', 'lexi 125', 'yamaha lexi'],
  },
]

// ─── Fuzzy search ──────────────────────────────────────────────────
export function searchCatalog(query: string, limit = 6): CatalogBike[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  type Scored = { bike: CatalogBike; score: number }
  const scored: Scored[] = []
  for (const bike of BIKE_CATALOG) {
    const haystacks = [
      `${bike.brand} ${bike.model}`.toLowerCase(),
      bike.brand.toLowerCase(),
      bike.model.toLowerCase(),
      ...(bike.aliases ?? []).map((a) => a.toLowerCase()),
    ]
    let score = 0
    for (const h of haystacks) {
      if (h === q) score = Math.max(score, 100)
      else if (h.startsWith(q)) score = Math.max(score, 80)
      else if (h.includes(q)) score = Math.max(score, 50)
    }
    if (score > 0) scored.push({ bike, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.bike)
}

// ─── Gap analysis — what's missing for full Indonesia coverage ─────
// Documented here so the next batch of photo URLs can target gaps:
//
//   BEBEK / UNDERBONE — covered with Supra X 125 + Vega Force. Could
//   add Honda Revo or Yamaha Jupiter Z for variety, but not critical.
//
//   ELECTRIC — entry-level covered with Honda EM1 e: + Selis E-Max.
//   Could add Volta 401, Polytron Fox-R, Alva One for variety later.
//
//   HIGH-CC SPORT / BIG BIKE — Ninja 400 + Heritage Softail in catalog.
//   Could add Yamaha R3, Honda CB650R, Yamaha MT-25, Kawasaki Z250.
//
//   MATIC tourist hubs — Stylo 160 + Lexi covered. Could still add
//   Honda Genio, Yamaha Grand Filano, Yamaha Freego, Suzuki Address 110.
//
//   MORE ADVENTURE for off-road tourism:
//     - Honda CRF250L, Yamaha WR155R, Kawasaki KLX 230
