// Quick-reply templates — riders copy these into WhatsApp instead of typing.
// All in casual professional Bahasa Indonesia.
export type Template = {
  id: string
  category: 'salam' | 'info' | 'tanya' | 'tutup'
  label: string                 // short label for the card
  text: string                  // body to copy
}

export const REPLY_TEMPLATES: Template[] = [
  {
    id: 'greeting',
    category: 'salam',
    label: 'Salam pembuka',
    text:
      'Halo kak 👋 Terima kasih sudah pesan via IndoCity. Saya siap berangkat sekarang. Ada hal khusus yang perlu saya bawa?',
  },
  {
    id: 'eta',
    category: 'info',
    label: 'Estimasi waktu sampai',
    text:
      'Berdasarkan jarak, estimasi sampai ±15-25 menit tergantung lalu lintas. Saya update lokasi saat sudah dekat ya kak 🛵',
  },
  {
    id: 'capacity',
    category: 'info',
    label: 'Kapasitas paket',
    text:
      'Motor saya bisa angkut paket sampai ±20kg dengan ukuran maks 40×40×50cm. Untuk barang yang lebih besar boleh dichat dulu, kita cek caranya 👍',
  },
  {
    id: 'cod',
    category: 'tanya',
    label: 'COD & pembayaran',
    text:
      'Pembayaran bisa cash di tempat (COD), transfer BCA/Mandiri, GoPay, atau OVO. Boleh nanti aja saat sudah ketemu ya 🙏',
  },
  {
    id: 'pickup_detail',
    category: 'tanya',
    label: 'Detail jemput',
    text:
      'Untuk memudahkan, boleh share lokasi pinpoint via WhatsApp? Kalau ada landmark dekat (Indomaret/warung dll) juga boleh disebut 📍',
  },
  {
    id: 'out_of_town',
    category: 'tanya',
    label: 'Luar kota',
    text:
      'Untuk luar kota saya biasanya sampai Magelang/Klaten/Bantul. Untuk jarak yang lebih jauh nego harga dulu ya kak. Kalau ada deadline waktu boleh disebut.',
  },
  {
    id: 'thank_you',
    category: 'tutup',
    label: 'Terima kasih (selesai)',
    text:
      'Terima kasih kak sudah pakai jasa saya hari ini 🙏 Jika puas, mohon bantu share profil saya ke teman-teman ya. Sampai jumpa di order berikutnya!',
  },
  {
    id: 'busy_now',
    category: 'tutup',
    label: 'Sedang sibuk',
    text:
      'Mohon maaf kak, saat ini saya masih dalam pengantaran. Estimasi free dalam ±30 menit. Boleh ditunggu, atau bisa juga pilih rider lain di marketplace IndoCity 🙏',
  },
]

export const CATEGORY_LABELS = {
  salam: 'Pembuka',
  info:  'Info',
  tanya: 'Tanya jawab',
  tutup: 'Penutup',
} as const

export const CATEGORY_COLORS = {
  salam: '#22C55E',
  info:  '#FACC15',
  tanya: '#60A5FA',
  tutup: '#A78BFA',
} as const
