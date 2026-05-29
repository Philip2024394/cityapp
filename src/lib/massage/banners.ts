import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'
import { MASSAGE_TYPE_SHORT, type MassageType } from './types'

// Massage banner library — same shape as beautician's BANNER_LIBRARY and
// handyman's HANDYMAN_BANNER_LIBRARY: theme-hex (uppercase) → category id
// (MassageType) → entries.
//
// Default theme is pink (#EC4899) — matches the marketplace accent the
// edit page passes as `defaultThemeHex`/`selectedAccentHex`. Add more
// theme buckets if per-therapist palette accents land later.
//
// Categorisation rule: only banners whose filename unambiguously matches
// a specific modality (e.g. "bali massage", "hot stones") sit under that
// modality. Anything generic (room shots, location plates, numbered
// uploads) goes under 'mixed' so it's surfaced regardless of the
// therapist's specialty without us guessing the contents.
export const MASSAGE_BANNER_LIBRARY: BannerLibrary = {
  '#EC4899': {
    balinese: [
      'https://ik.imagekit.io/7grri5v7d/bali%20massage%20indonisea.png?updatedAt=1761591108161',
      'https://ik.imagekit.io/7grri5v7d/bali%20massage.png?updatedAt=1761590994932',
    ],
    javanese: [
      'https://ik.imagekit.io/7grri5v7d/massage%20jogja.png?updatedAt=1761561097008',
    ],
    lulur: [
      'https://ik.imagekit.io/7grri5v7d/body%20scrube.png?updatedAt=1767543557285',
    ],
    refleksi: [
      'https://ik.imagekit.io/7grri5v7d/foot%20massage.png?updatedAt=1767211778688',
    ],
    hot_stone: [
      'https://ik.imagekit.io/7grri5v7d/hot%20stones.png?updatedAt=1771700323108',
    ],
    mixed: [
      // Originally seeded (2026-05-29)
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2012_02_54%20PM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2012_04_45%20PM.png',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20May%2029,%202026,%2012_08_23%20PM.png',
      // Founder upload batch — generic massage / room / location shots.
      // 'facial home service' moved out to the facial + skincare
      // verticals in mig 0143 since it doesn't belong on massage.
      'https://ik.imagekit.io/7grri5v7d/massage%20room%202.png?updatedAt=1771795940134',
      'https://ik.imagekit.io/7grri5v7d/massage%20room%203.png?updatedAt=1771795919965',
      'https://ik.imagekit.io/7grri5v7d/massage%20it.png?updatedAt=1771700105517',
      'https://ik.imagekit.io/7grri5v7d/nair%2020.png?updatedAt=1771619547582',
      'https://ik.imagekit.io/7grri5v7d/nair%2019.png?updatedAt=1771619530709',
      'https://ik.imagekit.io/7grri5v7d/nair%2018.png?updatedAt=1771619515495',
      'https://ik.imagekit.io/7grri5v7d/nair%2017.png?updatedAt=1771619499670',
      'https://ik.imagekit.io/7grri5v7d/nair%2016.png?updatedAt=1771619485573',
      'https://ik.imagekit.io/7grri5v7d/nair%2015.png?updatedAt=1771619471106',
      'https://ik.imagekit.io/7grri5v7d/nair%2014.png?updatedAt=1771619455401',
      'https://ik.imagekit.io/7grri5v7d/nair%2013.png?updatedAt=1771619440415',
      'https://ik.imagekit.io/7grri5v7d/nair%2012.png?updatedAt=1771619424730',
      'https://ik.imagekit.io/7grri5v7d/nair%2011.png?updatedAt=1771619409005',
      'https://ik.imagekit.io/7grri5v7d/nair%2010.png?updatedAt=1771619392129',
      'https://ik.imagekit.io/7grri5v7d/nair%209.png?updatedAt=1771619375574',
      'https://ik.imagekit.io/7grri5v7d/nair%208.png?updatedAt=1771619359820',
      'https://ik.imagekit.io/7grri5v7d/nair%207.png?updatedAt=1771619343411',
      'https://ik.imagekit.io/7grri5v7d/nair%206.png?updatedAt=1771619325162',
      'https://ik.imagekit.io/7grri5v7d/nair%205.png?updatedAt=1771619309437',
      'https://ik.imagekit.io/7grri5v7d/nair%204.png?updatedAt=1771619286117',
      'https://ik.imagekit.io/7grri5v7d/nair%203.png?updatedAt=1771619269253',
      'https://ik.imagekit.io/7grri5v7d/nair%202.png?updatedAt=1771619250992',
      'https://ik.imagekit.io/7grri5v7d/nair%201.png?updatedAt=1771619210866',
      'https://ik.imagekit.io/7grri5v7d/indonisea%20place%207.png?updatedAt=1767203840641',
      'https://ik.imagekit.io/7grri5v7d/indonisea%20place%204.png?updatedAt=1767203785161',
      'https://ik.imagekit.io/7grri5v7d/indonisea%20place%201.png?updatedAt=1767203724558',
      'https://ik.imagekit.io/7grri5v7d/our%20mission.png?updatedAt=1764790179190',
      'https://ik.imagekit.io/7grri5v7d/massage%20tables.png?updatedAt=1761608423366',
      'https://ik.imagekit.io/7grri5v7d/massage%20solo.png?updatedAt=1761593342541',
      'https://ik.imagekit.io/7grri5v7d/massage%20villa%20service%20indonisea.png?updatedAt=1761583264188',
      'https://ik.imagekit.io/7grri5v7d/massage%20image%2010.png?updatedAt=1760187307232',
      'https://ik.imagekit.io/7grri5v7d/massage%20image%207.png?updatedAt=1760187181168',
      'https://ik.imagekit.io/7grri5v7d/massage%20image%209.png?updatedAt=1760187266868',
      'https://ik.imagekit.io/7grri5v7d/massage%20image%205.png?updatedAt=1760187081702',
      'https://ik.imagekit.io/7grri5v7d/massage%20image%203.png?updatedAt=1760186998015',
      'https://ik.imagekit.io/7grri5v7d/massage%20image%202.png?updatedAt=1760186944882',
      'https://ik.imagekit.io/7grri5v7d/massage%20image%204.png?updatedAt=1760187040909',
      'https://ik.imagekit.io/7grri5v7d/massage%20image%2011.png?updatedAt=1760187471233',
      'https://ik.imagekit.io/7grri5v7d/massage%20image%201.png?updatedAt=1760186885261',
    ],
  },
}

// Categories the picker iterates. Mirror handyman: expose every
// MassageType so when banners are added later they can be grouped by
// modality. Order follows MASSAGE_TYPE_SHORT (which already follows the
// grouped catalog in types.ts).
export const MASSAGE_BANNER_CATEGORIES: BannerCategory[] = (
  Object.keys(MASSAGE_TYPE_SHORT) as MassageType[]
).map((id) => ({ id, label: MASSAGE_TYPE_SHORT[id] }))
