import type { BannerCategory, BannerLibrary } from '@/lib/banners/library'

// Places banner library — same shape as the other verticals'
// libraries: theme hex (uppercase) → category id → entries.
//
// Categories here are CUISINE TYPES (the places.cuisine_types column is
// a free-form text[], not a fixed enum, so we use plain lowercase IDs
// like 'indonesian', 'italian', etc.). Default theme is emerald
// (#10B981), matching the places edit page's `defaultThemeHex` /
// `selectedAccentHex`.
export const PLACES_BANNER_LIBRARY: BannerLibrary = {
  '#10B981': {
    indonesian: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_36_56%20AM.png?updatedAt=1776710234849',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_36_12%20AM.png?updatedAt=1776710188384',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_35_10%20AM.png?updatedAt=1776710128590',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_58_16%20AM.png?updatedAt=1776711509774',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2002_03_59%20AM.png?updatedAt=1776711853142',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2002_10_50%20AM.png?updatedAt=1776712266070',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2002_08_24%20AM.png?updatedAt=1776712120137',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2002_11_46%20AM.png?updatedAt=1776712322545',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2002_18_50%20AM.png?updatedAt=1776712745413',
      'https://ik.imagekit.io/7grri5v7d/nasi%20uduk.png?updatedAt=1759938243210',
      'https://ik.imagekit.io/7grri5v7d/babi%20ganang.png?updatedAt=1759671010083',
      'https://ik.imagekit.io/7grri5v7d/nasi%20padang.png?updatedAt=1759670802691',
      'https://ik.imagekit.io/7grri5v7d/indonisea%20foods%20streets%20food.png?updatedAt=1759667894360',
      'https://ik.imagekit.io/7grri5v7d/nasi%20campur%20bali.png?updatedAt=1759668715918',
      'https://ik.imagekit.io/7grri5v7d/ayam.png?updatedAt=1759669598178',
      'https://ik.imagekit.io/7grri5v7d/indonisea%20food.png?updatedAt=1759666970022',
      'https://ik.imagekit.io/7grri5v7d/BAKSO%20SOUPS%20INDONISEA.png?updatedAt=1759479754735',
      'https://ik.imagekit.io/7grri5v7d/INDONISEA%20FOODSS.png?updatedAt=1759485543877',
      'https://ik.imagekit.io/7grri5v7d/nasi%20goreng.png?updatedAt=1759478879677',
      'https://ik.imagekit.io/7grri5v7d/nasi%20gorengS.png?updatedAt=1759479178751',
    ],
    sushi: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_45_59%20AM.png?updatedAt=1776710776455',
      'https://ik.imagekit.io/7grri5v7d/strehdjdewweedsdsEE.png?updatedAt=1773523404038',
    ],
    rooftop_bar: [
      'https://ik.imagekit.io/7grri5v7d/strehdjdewweeds.png?updatedAt=1773522563882',
    ],
    live_music: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2024,%202026,%2004_28_23%20PM.png?updatedAt=1777022918950',
    ],
    mixed: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2024,%202026,%2003_53_13%20PM.png?updatedAt=1777020809884',
    ],
    fresh_juice: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_52_56%20AM.png?updatedAt=1776711191008',
    ],
    ice_cream: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2002_17_47%20AM.png?updatedAt=1776712682543',
    ],
    burger_fries: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_39_31%20AM.png?updatedAt=1776710385538',
    ],
    steak: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_37_37%20AM.png?updatedAt=1776710272663',
    ],
    pasta: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_40_54%20AM.png?updatedAt=1776710476334',
    ],
    fish: [
      // Same URL also lives under 'indonesian' — kept in both per the
      // established cross-category-duplication pattern.
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_36_56%20AM.png?updatedAt=1776710234849',
    ],
    chicken_satay: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_57_36%20AM.png?updatedAt=1776711475931',
    ],
    cake_shop: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2002_02_58%20AM.png?updatedAt=1776711793361',
    ],
    pizza: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_42_04%20AM.png?updatedAt=1776710542088',
      'https://ik.imagekit.io/7grri5v7d/pizza%20night.png?updatedAt=1773520721010',
    ],
    indonesian_drinks_ice: [
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2002_16_53%20AM.png?updatedAt=1776712630695',
      'https://ik.imagekit.io/nepgaxllc/ChatGPT%20Image%20Apr%2021,%202026,%2001_56_14%20AM.png?updatedAt=1776711389652',
      'https://ik.imagekit.io/7grri5v7d/DRINKS%20INDONISEA.png?updatedAt=1759484189273',
      'https://ik.imagekit.io/7grri5v7d/indonisea%20foods%20streets%20snacks.png?updatedAt=1759835680795',
      'https://ik.imagekit.io/7grri5v7d/indonisea%20foods%20streets%20snack.png?updatedAt=1759835453951',
      'https://ik.imagekit.io/7grri5v7d/indo%20food%20dribks.png?updatedAt=1759835207714',
      'https://ik.imagekit.io/7grri5v7d/indo%20food%20dribks%20news%20s.png?updatedAt=1759836312452',
      'https://ik.imagekit.io/7grri5v7d/indo%20food%20dribks%20news%20ss.png?updatedAt=1759836490692',
      'https://ik.imagekit.io/7grri5v7d/indo%20food%20dribks%20news%20sss.png?updatedAt=1759836678037',
    ],
    indonesian_street_food: [
      'https://ik.imagekit.io/7grri5v7d/strehdjd.png?updatedAt=1773521354779',
      'https://ik.imagekit.io/7grri5v7d/indo%20food%20dribks%20news.png?updatedAt=1759836130155',
      'https://ik.imagekit.io/7grri5v7d/indo%20food%20dribks%20new.png?updatedAt=1759835945234',
      'https://ik.imagekit.io/7grri5v7d/indo%20food.png?updatedAt=1759835045543',
      'https://ik.imagekit.io/7grri5v7d/indonesia%20foods%20streets%20sauages.png?updatedAt=1759834878515',
      'https://ik.imagekit.io/7grri5v7d/indonesia%20foods%20streets%20sauage.png?updatedAt=1759834598295',
      'https://ik.imagekit.io/7grri5v7d/indonesia%20foods%20streets.png?updatedAt=1759834365970',
      'https://ik.imagekit.io/7grri5v7d/indonisea%20foods%20street.png?updatedAt=1759834065127',
      'https://ik.imagekit.io/7grri5v7d/indonesia%20foods.png?updatedAt=1759833796560',
      'https://ik.imagekit.io/7grri5v7d/cke%20indon%20esia.png?updatedAt=1759833291091',
      'https://ik.imagekit.io/7grri5v7d/ayam%20checken%20indonesia%20taste.png?updatedAt=1759670097997',
      'https://ik.imagekit.io/7grri5v7d/ayam%20checken%20indonesia.png?updatedAt=1759669734358',
      'https://ik.imagekit.io/7grri5v7d/ayam.png?updatedAt=1759669598178',
      'https://ik.imagekit.io/7grri5v7d/burben%20iyam.png?updatedAt=1759668359994',
      'https://ik.imagekit.io/7grri5v7d/indonisea%20foods%20streets.png?updatedAt=1759667597383',
      'https://ik.imagekit.io/7grri5v7d/INDONISEA%20FOODSSSS.png?updatedAt=1759486101825',
      'https://ik.imagekit.io/7grri5v7d/INDONISEA%20FOODSSS.png?updatedAt=1759485908706',
      'https://ik.imagekit.io/7grri5v7d/INDONISEA%20FOODSS.png?updatedAt=1759485543877',
      'https://ik.imagekit.io/7grri5v7d/INDONISEA%20FOODS.png?updatedAt=1759484963614',
      'https://ik.imagekit.io/7grri5v7d/BAKSO%20SOUPS%20INDONISEAS.png?updatedAt=1759480304846',
      'https://ik.imagekit.io/7grri5v7d/BAKSO%20SOUPS%20INDONISEA.png?updatedAt=1759479754735',
      'https://ik.imagekit.io/7grri5v7d/BAKSO%20SOUPS.png?updatedAt=1759479606170',
      'https://ik.imagekit.io/7grri5v7d/BAKSO%20SOUP.png?updatedAt=1759479466752',
      'https://ik.imagekit.io/7grri5v7d/nasi%20goreng.png?updatedAt=1759478879677',
    ],
  },
}

// Cuisine-category list the picker iterates. Order = display order in
// the picker. Add entries here as new cuisine buckets land in
// PLACES_BANNER_LIBRARY (any theme).
export const PLACES_BANNER_CATEGORIES: BannerCategory[] = [
  { id: 'indonesian',             label: 'Indonesian' },
  { id: 'indonesian_street_food', label: 'Indonesian — Street Food' },
  { id: 'indonesian_drinks_ice',  label: 'Indonesian — Drinks & Ice' },
  { id: 'fresh_juice',            label: 'Fresh Juice' },
  { id: 'ice_cream',              label: 'Ice Cream' },
  { id: 'burger_fries',           label: 'Burger & Fries' },
  { id: 'steak',                  label: 'Steak' },
  { id: 'pasta',                  label: 'Pasta' },
  { id: 'fish',                   label: 'Fish' },
  { id: 'chicken_satay',          label: 'Chicken Satay' },
  { id: 'cake_shop',              label: 'Cake Shop' },
  { id: 'italian',       label: 'Italian' },
  { id: 'pizza',         label: 'Pizza' },
  { id: 'japanese',      label: 'Japanese' },
  { id: 'sushi',         label: 'Sushi' },
  { id: 'korean',        label: 'Korean' },
  { id: 'chinese',       label: 'Chinese' },
  { id: 'thai',          label: 'Thai' },
  { id: 'indian',        label: 'Indian' },
  { id: 'mexican',       label: 'Mexican' },
  { id: 'mediterranean', label: 'Mediterranean' },
  { id: 'western',       label: 'Western' },
  { id: 'seafood',       label: 'Seafood' },
  { id: 'vegan',         label: 'Vegan / Plant-based' },
  { id: 'fusion',        label: 'Fusion' },
  { id: 'cafe',          label: 'Cafe' },
  { id: 'bar',           label: 'Bar' },
  { id: 'rooftop_bar',   label: 'Rooftop Bar' },
  { id: 'live_music',    label: 'Live Music' },
  { id: 'mixed',         label: 'Mixed cuisine' },
]
