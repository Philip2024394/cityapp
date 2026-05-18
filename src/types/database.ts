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
export type TripStatus =
  | 'requested'
  | 'accepted'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'expired'
export type PaymentMethod = 'cash' | 'qr' | 'transfer'
export type PaymentStatus = 'pending' | 'confirmed' | 'disputed'
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

export interface TripRow {
  id: string
  driver_id: string
  customer_phone: string
  customer_name: string | null
  customer_user_id: string | null
  service: ServiceType
  status: TripStatus
  pickup_lat: number
  pickup_lng: number
  pickup_label: string | null
  dropoff_lat: number
  dropoff_lng: number
  dropoff_label: string | null
  pitstop_note: string | null
  distance_km: number | null
  estimated_fare: number | null
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  rating: number | null
  rating_comment: string | null
  cancel_reason: string | null
  created_at: string
  accepted_at: string | null
  completed_at: string | null
}

export interface TripEventRow {
  id: string
  trip_id: string
  actor_id: string | null
  event_type: string
  payload: Record<string, unknown> | null
  created_at: string
}

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
      trips: {
        Row: TripRow
        Insert: Partial<TripRow> & {
          driver_id: string
          customer_phone: string
          service: ServiceType
          pickup_lat: number
          pickup_lng: number
          dropoff_lat: number
          dropoff_lng: number
        }
        Update: Partial<TripRow>
        Relationships: []
      }
      trip_events: {
        Row: TripEventRow
        Insert: Partial<TripEventRow> & { trip_id: string; event_type: string }
        Update: Partial<TripEventRow>
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
export type Trip = TripRow
export type Profile = ProfileRow
export type Subscription = SubscriptionRow
