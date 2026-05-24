// Types for the Partner Program. Mirror the columns in 0044_partner_program.sql.
// Keep this hand-maintained in sync with the DB until a generator is added.

export type PartnerType =
  | 'hotel' | 'villa' | 'restaurant' | 'cafe' | 'spa' | 'tour_operator'
  | 'private_seller' | 'other'

export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'removed'

export type PartnerBookingStatus =
  | 'pending' | 'awaiting_review' | 'settled' | 'disputed' | 'waived'

export type PartnerPayoutMethod =
  | 'bank_transfer' | 'qris'
  | 'gopay' | 'ovo' | 'dana' | 'shopeepay'
  | 'cash'

export const PARTNER_PAYOUT_METHOD_LABELS: Record<PartnerPayoutMethod, string> = {
  bank_transfer: 'Bank transfer',
  qris:          'QRIS',
  gopay:         'GoPay',
  ovo:           'OVO',
  dana:          'DANA',
  shopeepay:     'ShopeePay',
  cash:          'Cash on hand',
}

export interface Partner {
  id: string
  slug: string
  name: string
  partner_type: PartnerType
  contact_email: string
  contact_phone: string | null
  contact_whatsapp: string | null
  address: string | null
  city: string | null
  lat: number | null
  lng: number | null
  owner_user_id: string | null
  commission_rate: number
  status: PartnerStatus
  notes: string | null
  // Payout details — added by migration 0046. Driver reads these via RLS
  // only when they have an outstanding booking against this partner.
  payout_method: PartnerPayoutMethod | null
  payout_account_number: string | null
  payout_account_name: string | null
  payout_bank_code: string | null
  payout_qris_image_url: string | null
  payout_notes: string | null
  created_at: string
  updated_at: string
}

export interface PartnerBooking {
  id: string
  partner_id: string
  driver_user_id: string
  pickup_name: string | null
  dropoff_name: string | null
  service_type: string | null
  fare_idr: number
  commission_idr: number
  rider_anon_id: string | null
  status: PartnerBookingStatus
  settled_at: string | null
  settled_by: string | null
  dispute_reason: string | null
  // Driver-uploaded payment proof (migration 0046). Set when driver flips
  // status pending → awaiting_review; cleared on accept (settled) or kept
  // for audit on reject.
  proof_image_url: string | null
  proof_uploaded_at: string | null
  proof_uploaded_by: string | null
  proof_amount_idr: number | null
  proof_method: string | null
  reject_reason: string | null
  reject_at: string | null
  created_at: string
  due_at: string
}

export interface PartnerBalanceRow {
  partner_id: string
  partner_slug: string
  partner_name: string
  outstanding_idr: number
  bookings_count: number
  oldest_due_at: string | null
  is_overdue: boolean
}

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  hotel: 'Hotel',
  villa: 'Villa',
  restaurant: 'Restoran',
  cafe: 'Kafe',
  spa: 'Spa',
  tour_operator: 'Tour Operator',
  private_seller: 'Perorangan / Penjual pribadi',
  other: 'Lainnya',
}

export const DEFAULT_COMMISSION_RATE = 0.08
export const PARTNER_SETTLEMENT_WINDOW_DAYS = 7
