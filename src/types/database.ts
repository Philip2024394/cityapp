// ============================================================================
// City Rider — Supabase database types
// ============================================================================
// Hand-maintained to match supabase/migrations/0001_initial.sql.
// When the schema changes, run `supabase gen types typescript --local` to
// regenerate, or update this file directly.
// ============================================================================

export type Role = 'customer' | 'driver' | 'admin'
export type AvailabilityState = 'online' | 'busy' | 'offline'
export type DriverAccountStatus = 'active' | 'suspended'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled'
export type PaymentMethod = 'cash' | 'qr' | 'transfer'
export type ServiceType = 'person' | 'parcel' | 'food'
export type BikeType = 'matic' | 'sport' | 'manual'

export interface ProfileRow {
  id: string
  phone: string
  full_name: string | null
  photo_url: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface DriverRow {
  user_id: string
  slug: string
  business_name: string
  bio: string | null
  whatsapp_e164: string
  brand_logo_url: string | null
  city: string | null
  area: string | null
  service_zone_center_lat: number | null
  service_zone_center_lng: number | null
  service_zone_radius_km: number | null
  status: DriverAccountStatus
  availability: AvailabilityState
  current_lat: number | null
  current_lng: number | null
  current_location_updated_at: string | null
  last_active_at: string | null
  session_started_at: string | null
  online_until: string | null
  referral_code: string | null
  referrer_driver_id: string | null
  business_contract_enabled: boolean
  business_max_parcels_per_day: number | null
  business_services: string[]
  business_notes: string | null
  business_enabled_at: string | null
  b2b_score: number | null
  b2b_tier: 'top' | 'standard' | 'hidden' | 'removed' | null
  b2b_score_updated_at: string | null
  tour_guide_enabled: boolean
  tour_guide_day_rate_idr: number | null
  tour_guide_languages: string[]
  tour_guide_notes: string | null
  tour_guide_enabled_at: string | null
  bike_make: string | null
  bike_model: string | null
  bike_year: number | null
  bike_color: string | null
  bike_plate: string | null
  bike_type: BikeType | null
  bike_cc: number | null
  has_box: boolean
  services: ServiceType[]
  price_per_km: number
  min_fee: number
  pitstop_fee: number
  accepts_cash: boolean
  accepts_qr: boolean
  accepts_transfer: boolean
  qr_payment_url: string | null
  transfer_details: string | null
  rating: number | null
  trips_count: number
  created_at: string
  updated_at: string
}

export interface SubscriptionRow {
  driver_id: string
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_end: string | null
  amount_idr: number
  payment_reference: string | null
  notes: string | null
  updated_at: string
}

// Trip / dispatch tables were removed in migration 0010 to keep the
// platform on the directory side of Permenhub PM 12/2019 — see
// supabase/migrations/0010_remove_trips_workflow.sql.

export interface AuditLogRow {
  id: string
  actor_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  created_at: string
}

// ============================================================================
// Supabase Database shape (consumed by createClient<Database>)
// Note: each table must declare `Relationships: []` for supabase-js v2 to
// resolve table types correctly.
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Partial<ProfileRow> & { id: string; phone: string }
        Update: Partial<ProfileRow>
        Relationships: []
      }
      drivers: {
        Row: DriverRow
        Insert: Partial<DriverRow> & {
          user_id: string
          slug: string
          business_name: string
          whatsapp_e164: string
          price_per_km: number
          min_fee: number
        }
        Update: Partial<DriverRow>
        Relationships: []
      }
      subscriptions: {
        Row: SubscriptionRow
        Insert: Partial<SubscriptionRow> & { driver_id: string }
        Update: Partial<SubscriptionRow>
        Relationships: []
      }
      audit_log: {
        Row: AuditLogRow
        Insert: Partial<AuditLogRow> & { action: string }
        Update: Partial<AuditLogRow>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: Record<string, unknown>; Returns: boolean }
      is_driver: { Args: Record<string, unknown>; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience re-exports for app code
export type Driver = DriverRow
export type Profile = ProfileRow
export type Subscription = SubscriptionRow
