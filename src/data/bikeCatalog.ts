// ============================================================================
// Indonesian motorbike catalog — makes + models.
// ----------------------------------------------------------------------------
// Covers the bike models commonly used by Indonesian motorcycle couriers
// (ojek + kurir motor). Sourced from AISI member catalogues + popular
// model lists at otomotif outlets (~95% market coverage 2024-2026).
//
// Drivers can still type a custom make/model — the combobox falls back
// to free-text when the input doesn't match. This catalog is for fast
// selection of common bikes, not a closed allow-list.
//
// Order within each make is rough popularity (most common first).
// ============================================================================

export type BikeMake =
  | 'Honda'
  | 'Yamaha'
  | 'Suzuki'
  | 'Kawasaki'
  | 'Vespa'
  | 'TVS'
  | 'Viar'
  | 'Royal Enfield'
  | 'KTM'
  | 'Benelli'
  | 'BMW'
  | 'Ducati'
  | 'Aprilia'
  | 'Italjet'
  | 'Polytron'
  | 'Selis'
  | 'Volta'
  | 'Smoot'
  | 'Niu'
  | 'Yadea'
  | 'Other'

export const BIKE_MAKES: ReadonlyArray<BikeMake> = [
  'Honda',
  'Yamaha',
  'Suzuki',
  'Kawasaki',
  'Vespa',
  'TVS',
  'Viar',
  'Royal Enfield',
  'KTM',
  'Benelli',
  'BMW',
  'Ducati',
  'Aprilia',
  'Italjet',
  'Polytron',
  'Selis',
  'Volta',
  'Smoot',
  'Niu',
  'Yadea',
  'Other',
]

// Models per make — popular Indonesian-market models. NOT exhaustive
// for premium imports; rare bikes fall through to free-text entry.
export const BIKE_MODELS: Record<BikeMake, ReadonlyArray<string>> = {
  Honda: [
    'Beat', 'Beat Street', 'Genio',
    'Vario 125', 'Vario 160',
    'Scoopy', 'Stylo 160',
    'PCX 160', 'ADV 160', 'ADV 350',
    'Forza 250',
    'Supra X 125', 'Supra GTR 150',
    'Revo X', 'Revo Fit',
    'Verza', 'Megapro',
    'CB150R Streetfire', 'CB150X', 'CB150 Verza',
    'CBR150R', 'CBR250RR', 'CBR500R', 'CBR600RR', 'CBR1000RR',
    'CRF150L', 'CRF250 Rally', 'CRF1100L Africa Twin',
    'X-ADV',
    'Monkey', 'Super Cub',
  ],
  Yamaha: [
    'NMAX', 'NMAX Turbo', 'NMAX Neo',
    'Aerox 155', 'Aerox Alpha',
    'Mio M3', 'Mio S', 'Mio Gear', 'Mio Fazzio',
    'Fino', 'Filano',
    'X-Ride 125', 'Freego',
    'Lexi LX 155',
    'Grand Filano', 'Gear 125',
    'Vixion', 'Vixion R',
    'MT-15', 'MT-25', 'MT-09',
    'R15', 'R15 V4', 'R25', 'R3', 'R1',
    'Byson', 'FZ150i', 'XSR 155', 'XSR 900',
    'Tracer 9', 'Tenere 700',
    'WR155R', 'WR250R',
  ],
  Suzuki: [
    'Address 125', 'Address Playful',
    'NEX II', 'NEX Crossover',
    'Avenis 125', 'Skydrive Sport',
    'Burgman Street 125',
    'Satria F150', 'Satria FU',
    'Smash FI', 'Shogun Axelo',
    'GSX-R150', 'GSX-S150', 'GSX-R600', 'GSX-R750', 'GSX-R1000',
    'V-Strom 250 SX', 'V-Strom 650', 'V-Strom 1050',
    'Hayabusa', 'Katana',
  ],
  Kawasaki: [
    'KLX150', 'KLX150 BF', 'KLX230',
    'KSR Pro', 'D-Tracker 150',
    'W175', 'W175 SE', 'W175 TR',
    'Ninja 250', 'Ninja 250SL', 'Ninja ZX-25R', 'Ninja ZX-4R', 'Ninja ZX-6R',
    'Ninja H2', 'Ninja H2R', 'Ninja 650', 'Ninja 1000',
    'Z250', 'Z250SL', 'Z400', 'Z650', 'Z900', 'Z1000',
    'Versys 250', 'Versys 650', 'Versys 1000',
    'Vulcan S',
  ],
  Vespa: [
    'Sprint 150', 'Primavera 150', 'GTS 150', 'GTS Super 300',
    'LX 125', 'LX 150', 'S 125',
    '946', 'Sei Giorni',
    'Elettrica',
  ],
  TVS: [
    'Apache RTR 160', 'Apache RTR 180', 'Apache RTR 200 4V', 'Apache RR 310',
    'Dazz', 'Neo XR', 'Sport', 'Star City Plus',
    'Callisto', 'Ntorq 125',
  ],
  Viar: [
    'Cross X 200', 'Cross X 250 EC', 'Cross X 250 SM',
    'Karya 100', 'Karya 150', 'Karya 200',
    'New Q1 (Electric)',
  ],
  'Royal Enfield': [
    'Classic 350', 'Classic 500', 'Meteor 350',
    'Hunter 350', 'Bullet 350',
    'Continental GT 650', 'Interceptor 650',
    'Himalayan', 'Scram 411',
    'Super Meteor 650', 'Shotgun 650',
  ],
  KTM: [
    'Duke 125', 'Duke 200', 'Duke 250', 'Duke 390', 'Duke 790', 'Duke 890',
    'RC 200', 'RC 250', 'RC 390',
    '250 Adventure', '390 Adventure', '790 Adventure', '890 Adventure',
    'EXC 350', 'EXC 500',
  ],
  Benelli: [
    'TNT 135', 'TNT 150', 'TNT 250', 'TNT 600',
    'Leoncino 250', 'Leoncino 500',
    'Patagonian Eagle 250',
    '302S', '502C',
    'TRK 251', 'TRK 502', 'TRK 502X',
    'Imperiale 400',
  ],
  BMW: [
    'G 310 R', 'G 310 GS',
    'F 750 GS', 'F 800 R', 'F 850 GS',
    'R 1250 GS', 'R 1250 GS Adventure', 'R 1300 GS',
    'S 1000 R', 'S 1000 RR', 'S 1000 XR',
    'CE 04 (Electric)',
  ],
  Ducati: [
    'Scrambler 800', 'Scrambler Sixty2',
    'Monster 821', 'Monster 937',
    'Panigale V2', 'Panigale V4', 'Streetfighter V4',
    'Multistrada 950', 'Multistrada V4',
    'Diavel', 'XDiavel',
  ],
  Aprilia: [
    'SR GT 200', 'SR GT 150',
    'RS 660', 'Tuono 660',
    'RSV4', 'Tuono V4',
    'Tuareg 660',
  ],
  Italjet: [
    'Dragster 200', 'Dragster 500', 'Dragster 700',
  ],
  Polytron: [
    'Fox-R', 'T-Rex', 'X-Tron',  // Electric
  ],
  Selis: [
    'Go-Plus', 'Agats', 'Bromo', 'Mandalika',  // Electric
  ],
  Volta: [
    '401', 'Mandala',  // Electric
  ],
  Smoot: [
    'Tempur', 'Zuzu',  // Electric
  ],
  Niu: [
    'NQi GTS Pro', 'NQi Sport', 'UQi GT', 'MQi GT', 'KQi 3',  // Electric
  ],
  Yadea: [
    'E8S Pro', 'C-Like', 'T9', 'G6',  // Electric
  ],
  Other: [],
}

// Flat list of all "Make Model" combinations — handy for free-text
// autocomplete that searches across both fields at once.
export const ALL_BIKE_OPTIONS: ReadonlyArray<{ make: BikeMake; model: string; label: string }> =
  (BIKE_MAKES.flatMap((make) =>
    BIKE_MODELS[make].map((model) => ({ make, model, label: `${make} ${model}` })),
  ))
