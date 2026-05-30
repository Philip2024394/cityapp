export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_qr_codes: {
        Row: {
          account_name: string | null
          account_number: string | null
          active: boolean
          amount_idr: number
          bank_name: string | null
          created_at: string
          id: string
          image_url: string
          label: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          active?: boolean
          amount_idr: number
          bank_name?: string | null
          created_at?: string
          id?: string
          image_url: string
          label: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          active?: boolean
          amount_idr?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          image_url?: string
          label?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_agents: {
        Row: {
          agent_code: string
          bank_account: string | null
          bank_holder: string | null
          bank_name: string | null
          country: string
          created_at: string
          id: string
          ktp_url: string | null
          name: string
          paid_at: string | null
          payment_proof: string | null
          status: string
          total_clicks: number
          updated_at: string
          verification_status: string | null
          whatsapp: string
        }
        Insert: {
          agent_code: string
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          country: string
          created_at?: string
          id?: string
          ktp_url?: string | null
          name: string
          paid_at?: string | null
          payment_proof?: string | null
          status?: string
          total_clicks?: number
          updated_at?: string
          verification_status?: string | null
          whatsapp: string
        }
        Update: {
          agent_code?: string
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          country?: string
          created_at?: string
          id?: string
          ktp_url?: string | null
          name?: string
          paid_at?: string | null
          payment_proof?: string | null
          status?: string
          total_clicks?: number
          updated_at?: string
          verification_status?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      affiliate_banner_shares: {
        Row: {
          agent_code: string
          banner_id: string
          country_code: string | null
          created_at: string
          id: string
          ip: unknown
          platform: string | null
          referrer_url: string | null
          user_agent: string | null
        }
        Insert: {
          agent_code: string
          banner_id: string
          country_code?: string | null
          created_at?: string
          id?: string
          ip?: unknown
          platform?: string | null
          referrer_url?: string | null
          user_agent?: string | null
        }
        Update: {
          agent_code?: string
          banner_id?: string
          country_code?: string | null
          created_at?: string
          id?: string
          ip?: unknown
          platform?: string | null
          referrer_url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      affiliate_payouts: {
        Row: {
          agent_id: string
          amount_idr: number
          bank_account: string | null
          bank_holder: string | null
          bank_name: string | null
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          provider: string | null
          provider_txn_id: string | null
          referral_count: number
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          amount_idr: number
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          provider?: string | null
          provider_txn_id?: string | null
          referral_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          amount_idr?: number
          bank_account?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          provider?: string | null
          provider_txn_id?: string | null
          referral_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "affiliate_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_payouts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "affiliate_agents_public"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          agent_id: string
          app_tier: string | null
          app_type: string | null
          commission_amount: number
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          paid_at: string | null
          payout_id: string | null
          registration_id: string | null
          status: string
        }
        Insert: {
          agent_id: string
          app_tier?: string | null
          app_type?: string | null
          commission_amount?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          paid_at?: string | null
          payout_id?: string | null
          registration_id?: string | null
          status?: string
        }
        Update: {
          agent_id?: string
          app_tier?: string | null
          app_type?: string | null
          commission_amount?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          paid_at?: string | null
          payout_id?: string | null
          registration_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "affiliate_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "affiliate_agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "affiliate_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_seat_limits: {
        Row: {
          country_name: string
          created_at: string
          id: string
          max_seats: number
        }
        Insert: {
          country_name: string
          created_at?: string
          id: string
          max_seats?: number
        }
        Update: {
          country_name?: string
          created_at?: string
          id?: string
          max_seats?: number
        }
        Relationships: []
      }
      ai_usage_monthly: {
        Row: {
          ai_promo_count: number
          provider_id: string
          provider_type: string
          updated_at: string
          year_month: string
        }
        Insert: {
          ai_promo_count?: number
          provider_id: string
          provider_type: string
          updated_at?: string
          year_month: string
        }
        Update: {
          ai_promo_count?: number
          provider_id?: string
          provider_type?: string
          updated_at?: string
          year_month?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banner_purchases: {
        Row: {
          banner_url: string
          beautician_id: string
          created_at: string
          id: string
          payment_proof_url: string | null
          price_idr: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          banner_url: string
          beautician_id: string
          created_at?: string
          id?: string
          payment_proof_url?: string | null
          price_idr: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          banner_url?: string
          beautician_id?: string
          created_at?: string
          id?: string
          payment_proof_url?: string | null
          price_idr?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "banner_purchases_beautician_id_fkey"
            columns: ["beautician_id"]
            isOneToOne: false
            referencedRelation: "beautician_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      beautician_bookings: {
        Row: {
          beautician_id: string
          created_at: string
          customer_name: string
          customer_whatsapp: string
          id: string
          notes: string | null
          requested_date: string
          requested_time: string
          service_name: string | null
          status: string
          submitter_ip_hash: string | null
          updated_at: string
        }
        Insert: {
          beautician_id: string
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          id?: string
          notes?: string | null
          requested_date: string
          requested_time: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
        }
        Update: {
          beautician_id?: string
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          id?: string
          notes?: string | null
          requested_date?: string
          requested_time?: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beautician_bookings_beautician_id_fkey"
            columns: ["beautician_id"]
            isOneToOne: false
            referencedRelation: "beautician_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      beautician_providers: {
        Row: {
          availability: string
          avatar_frame_style: string
          bio: string
          business_name: string | null
          busy_dates: Json | null
          busy_time_slots: Json
          certifications: string[] | null
          city: string | null
          contact_email: string | null
          contact_form_enabled: boolean
          country_code: string
          cover_image_url: string | null
          created_at: string
          cta_button_effect: string
          custom_services_offered: string[] | null
          display_name: string
          facebook_url: string | null
          faq_enabled: boolean
          faq_items: Json
          gallery_image_urls: string[] | null
          gender: string
          has_physical_location: boolean
          hero_text: Json | null
          id: string
          inquiry_count: number
          instagram_url: string | null
          is_mock: boolean
          kakaotalk_id: string | null
          ktp_image_url: string | null
          languages: string[] | null
          last_active_at: string | null
          latitude: number | null
          legal_privacy: string | null
          legal_terms: string | null
          line_id: string | null
          longitude: number | null
          marketplace_categories: string[] | null
          midtrans_client_key: string | null
          midtrans_is_production: boolean
          midtrans_server_key_enc: string | null
          mock_hidden_at: string | null
          operating_hours: Json | null
          paid_until: string | null
          payment_provider: string
          price_hair_idr: number | null
          price_makeup_idr: number | null
          price_nail_idr: number | null
          profile_image_url: string | null
          promo_text: string | null
          rating: number | null
          rating_count: number
          rejected_reason: string | null
          service_area_notes: string | null
          service_locations: string[] | null
          service_photos: Json | null
          services_offered: string[] | null
          slug: string
          snapchat_url: string | null
          status: string
          stripe_publishable_key: string | null
          stripe_secret_key_enc: string | null
          subscription_status: string
          telegram_handle: string | null
          theme_color: string | null
          tiktok_url: string | null
          trial_ends_at: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
          visitor_count: number
          website_url: string | null
          wechat_id: string | null
          whatsapp_e164: string
          x_url: string | null
          years_experience: number
        }
        Insert: {
          availability?: string
          avatar_frame_style?: string
          bio: string
          business_name?: string | null
          busy_dates?: Json | null
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          cta_button_effect?: string
          custom_services_offered?: string[] | null
          display_name: string
          facebook_url?: string | null
          faq_enabled?: boolean
          faq_items?: Json
          gallery_image_urls?: string[] | null
          gender: string
          has_physical_location?: boolean
          hero_text?: Json | null
          id?: string
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          ktp_image_url?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          legal_privacy?: string | null
          legal_terms?: string | null
          line_id?: string | null
          longitude?: number | null
          marketplace_categories?: string[] | null
          midtrans_client_key?: string | null
          midtrans_is_production?: boolean
          midtrans_server_key_enc?: string | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          payment_provider?: string
          price_hair_idr?: number | null
          price_makeup_idr?: number | null
          price_nail_idr?: number | null
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rating_count?: number
          rejected_reason?: string | null
          service_area_notes?: string | null
          service_locations?: string[] | null
          service_photos?: Json | null
          services_offered?: string[] | null
          slug: string
          snapchat_url?: string | null
          status?: string
          stripe_publishable_key?: string | null
          stripe_secret_key_enc?: string | null
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164: string
          x_url?: string | null
          years_experience?: number
        }
        Update: {
          availability?: string
          avatar_frame_style?: string
          bio?: string
          business_name?: string | null
          busy_dates?: Json | null
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          cta_button_effect?: string
          custom_services_offered?: string[] | null
          display_name?: string
          facebook_url?: string | null
          faq_enabled?: boolean
          faq_items?: Json
          gallery_image_urls?: string[] | null
          gender?: string
          has_physical_location?: boolean
          hero_text?: Json | null
          id?: string
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          ktp_image_url?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          legal_privacy?: string | null
          legal_terms?: string | null
          line_id?: string | null
          longitude?: number | null
          marketplace_categories?: string[] | null
          midtrans_client_key?: string | null
          midtrans_is_production?: boolean
          midtrans_server_key_enc?: string | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          payment_provider?: string
          price_hair_idr?: number | null
          price_makeup_idr?: number | null
          price_nail_idr?: number | null
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rating_count?: number
          rejected_reason?: string | null
          service_area_notes?: string | null
          service_locations?: string[] | null
          service_photos?: Json | null
          services_offered?: string[] | null
          slug?: string
          snapchat_url?: string | null
          status?: string
          stripe_publishable_key?: string | null
          stripe_secret_key_enc?: string | null
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164?: string
          x_url?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      bike_rentals: {
        Row: {
          address: string | null
          available_now: boolean
          bike_type: string | null
          brand: string
          busy_time_slots: Json
          cc: number
          certifications: string[] | null
          city: string
          color: string | null
          contact_email: string | null
          contact_form_enabled: boolean
          country_code: string
          cover_image_url: string | null
          created_at: string
          custom_services_offered: string[] | null
          daily_price_idr: number
          delivers_to_hotel: boolean
          delivers_to_villa: boolean
          description: string | null
          driver_rate_per_day_idr: number | null
          facebook_url: string | null
          fuel_included: boolean
          has_delivery_box: boolean
          has_phone_charger: boolean
          has_phone_holder: boolean
          helmet_count: number
          id: string
          image_urls: string[]
          inquiry_count: number
          instagram_url: string | null
          kakaotalk_id: string | null
          languages: string[] | null
          last_active_at: string | null
          lat: number
          line_id: string | null
          listing_tier: string
          lng: number
          location: unknown
          model: string
          monthly_price_idr: number | null
          operating_hours: Json | null
          owner_company: string | null
          owner_languages: string[]
          owner_name: string
          owner_response_time_min: number | null
          owner_user_id: string | null
          owner_whatsapp_e164: string
          paid_until: string | null
          pickup_dropoff: boolean
          raincoat_count: number
          rating: number | null
          ready_to_work: boolean
          rejection_note: string | null
          rental_mode: string
          review_count: number
          security_deposit_idr: number | null
          slug: string
          snapchat_url: string | null
          status: string
          submitted_email: string | null
          submitted_name: string | null
          submitted_whatsapp: string | null
          tags: string[]
          telegram_handle: string | null
          tiktok_url: string | null
          tour_3h_idr: number | null
          tour_6h_idr: number | null
          tour_8h_idr: number | null
          transmission: string
          updated_at: string
          verified: boolean
          visitor_count: number
          website_url: string | null
          wechat_id: string | null
          weekly_price_idr: number | null
          x_url: string | null
          year: number
        }
        Insert: {
          address?: string | null
          available_now?: boolean
          bike_type?: string | null
          brand: string
          busy_time_slots?: Json
          cc: number
          certifications?: string[] | null
          city: string
          color?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          daily_price_idr: number
          delivers_to_hotel?: boolean
          delivers_to_villa?: boolean
          description?: string | null
          driver_rate_per_day_idr?: number | null
          facebook_url?: string | null
          fuel_included?: boolean
          has_delivery_box?: boolean
          has_phone_charger?: boolean
          has_phone_holder?: boolean
          helmet_count?: number
          id?: string
          image_urls?: string[]
          inquiry_count?: number
          instagram_url?: string | null
          kakaotalk_id?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          lat: number
          line_id?: string | null
          listing_tier?: string
          lng: number
          location: unknown
          model: string
          monthly_price_idr?: number | null
          operating_hours?: Json | null
          owner_company?: string | null
          owner_languages?: string[]
          owner_name: string
          owner_response_time_min?: number | null
          owner_user_id?: string | null
          owner_whatsapp_e164: string
          paid_until?: string | null
          pickup_dropoff?: boolean
          raincoat_count?: number
          rating?: number | null
          ready_to_work?: boolean
          rejection_note?: string | null
          rental_mode: string
          review_count?: number
          security_deposit_idr?: number | null
          slug: string
          snapchat_url?: string | null
          status?: string
          submitted_email?: string | null
          submitted_name?: string | null
          submitted_whatsapp?: string | null
          tags?: string[]
          telegram_handle?: string | null
          tiktok_url?: string | null
          tour_3h_idr?: number | null
          tour_6h_idr?: number | null
          tour_8h_idr?: number | null
          transmission: string
          updated_at?: string
          verified?: boolean
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          weekly_price_idr?: number | null
          x_url?: string | null
          year: number
        }
        Update: {
          address?: string | null
          available_now?: boolean
          bike_type?: string | null
          brand?: string
          busy_time_slots?: Json
          cc?: number
          certifications?: string[] | null
          city?: string
          color?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          daily_price_idr?: number
          delivers_to_hotel?: boolean
          delivers_to_villa?: boolean
          description?: string | null
          driver_rate_per_day_idr?: number | null
          facebook_url?: string | null
          fuel_included?: boolean
          has_delivery_box?: boolean
          has_phone_charger?: boolean
          has_phone_holder?: boolean
          helmet_count?: number
          id?: string
          image_urls?: string[]
          inquiry_count?: number
          instagram_url?: string | null
          kakaotalk_id?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          lat?: number
          line_id?: string | null
          listing_tier?: string
          lng?: number
          location?: unknown
          model?: string
          monthly_price_idr?: number | null
          operating_hours?: Json | null
          owner_company?: string | null
          owner_languages?: string[]
          owner_name?: string
          owner_response_time_min?: number | null
          owner_user_id?: string | null
          owner_whatsapp_e164?: string
          paid_until?: string | null
          pickup_dropoff?: boolean
          raincoat_count?: number
          rating?: number | null
          ready_to_work?: boolean
          rejection_note?: string | null
          rental_mode?: string
          review_count?: number
          security_deposit_idr?: number | null
          slug?: string
          snapchat_url?: string | null
          status?: string
          submitted_email?: string | null
          submitted_name?: string | null
          submitted_whatsapp?: string | null
          tags?: string[]
          telegram_handle?: string | null
          tiktok_url?: string | null
          tour_3h_idr?: number | null
          tour_6h_idr?: number | null
          tour_8h_idr?: number | null
          transmission?: string
          updated_at?: string
          verified?: boolean
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          weekly_price_idr?: number | null
          x_url?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "bike_rentals_city_fkey"
            columns: ["city"]
            isOneToOne: false
            referencedRelation: "city_zones"
            referencedColumns: ["city"]
          },
        ]
      }
      city_zones: {
        Row: {
          centroid: unknown
          centroid_lat: number
          centroid_lng: number
          city: string
          created_at: string
          geometry: unknown
          id: string
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
          updated_at: string
        }
        Insert: {
          centroid: unknown
          centroid_lat: number
          centroid_lng: number
          city: string
          created_at?: string
          geometry: unknown
          id?: string
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
          updated_at?: string
        }
        Update: {
          centroid?: unknown
          centroid_lat?: number
          centroid_lng?: number
          city?: string
          created_at?: string
          geometry?: unknown
          id?: string
          max_lat?: number
          max_lng?: number
          min_lat?: number
          min_lng?: number
          updated_at?: string
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          active_from: string
          active_until: string | null
          amount_idr: number
          app_tier: string
          app_type: string
          created_at: string
          id: string
        }
        Insert: {
          active_from?: string
          active_until?: string | null
          amount_idr: number
          app_tier: string
          app_type: string
          created_at?: string
          id?: string
        }
        Update: {
          active_from?: string
          active_until?: string | null
          amount_idr?: number
          app_tier?: string
          app_type?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      connection_intent: {
        Row: {
          driver_id: string
          id: number
          ip_hash: string | null
          occurred_at: string
          source: string
          user_agent: string | null
          vertical: string
        }
        Insert: {
          driver_id: string
          id?: number
          ip_hash?: string | null
          occurred_at?: string
          source: string
          user_agent?: string | null
          vertical: string
        }
        Update: {
          driver_id?: string
          id?: number
          ip_hash?: string | null
          occurred_at?: string
          source?: string
          user_agent?: string | null
          vertical?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          id: number
          message: string
          provider_id: string
          provider_type: string
          read_at: string | null
          replied_at: string | null
          sender_email: string
          sender_name: string
          sender_phone: string | null
          source_ip: unknown
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          message: string
          provider_id: string
          provider_type: string
          read_at?: string | null
          replied_at?: string | null
          sender_email: string
          sender_name: string
          sender_phone?: string | null
          source_ip?: unknown
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          message?: string
          provider_id?: string
          provider_type?: string
          read_at?: string | null
          replied_at?: string | null
          sender_email?: string
          sender_name?: string
          sender_phone?: string | null
          source_ip?: unknown
          user_agent?: string | null
        }
        Relationships: []
      }
      customer_saved_places: {
        Row: {
          created_at: string
          display_order: number
          emoji: string
          id: string
          label: string | null
          lat: number
          lng: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          emoji?: string
          id?: string
          label?: string | null
          lat: number
          lng: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          emoji?: string
          id?: string
          label?: string | null
          lat?: number
          lng?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_saved_places_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          centroid_lat: number | null
          centroid_lng: number | null
          created_at: string
          id: string
          name: string
          regency_id: string
        }
        Insert: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          id: string
          name: string
          regency_id: string
        }
        Update: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          id?: string
          name?: string
          regency_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_regency_id_fkey"
            columns: ["regency_id"]
            isOneToOne: false
            referencedRelation: "regencies"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_requests: {
        Row: {
          beautician_id: string | null
          contact_city: string | null
          contact_name: string
          contact_whatsapp: string
          created_at: string
          domain_choice_1: string
          domain_choice_2: string | null
          domain_choice_3: string | null
          id: string
          price_idr: number
          registered_domain: string | null
          registrar_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tld: string
          user_id: string
        }
        Insert: {
          beautician_id?: string | null
          contact_city?: string | null
          contact_name: string
          contact_whatsapp: string
          created_at?: string
          domain_choice_1: string
          domain_choice_2?: string | null
          domain_choice_3?: string | null
          id?: string
          price_idr?: number
          registered_domain?: string | null
          registrar_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tld?: string
          user_id: string
        }
        Update: {
          beautician_id?: string | null
          contact_city?: string | null
          contact_name?: string
          contact_whatsapp?: string
          created_at?: string
          domain_choice_1?: string
          domain_choice_2?: string | null
          domain_choice_3?: string | null
          id?: string
          price_idr?: number
          registered_domain?: string | null
          registrar_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tld?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_requests_beautician_id_fkey"
            columns: ["beautician_id"]
            isOneToOne: false
            referencedRelation: "beautician_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_buddies: {
        Row: {
          graduated_at: string | null
          id: string
          mentee_user_id: string
          mentor_user_id: string
          paired_at: string
          reward_claimed: boolean
        }
        Insert: {
          graduated_at?: string | null
          id?: string
          mentee_user_id: string
          mentor_user_id: string
          paired_at?: string
          reward_claimed?: boolean
        }
        Update: {
          graduated_at?: string | null
          id?: string
          mentee_user_id?: string
          mentor_user_id?: string
          paired_at?: string
          reward_claimed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "driver_buddies_mentee_user_id_fkey"
            columns: ["mentee_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_buddies_mentor_user_id_fkey"
            columns: ["mentor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_contact_pings: {
        Row: {
          acknowledged_at: string | null
          acknowledged_via: string | null
          customer_anon_id: string | null
          driver_user_id: string
          id: string
          pinged_at: string
          source_page: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_via?: string | null
          customer_anon_id?: string | null
          driver_user_id: string
          id?: string
          pinged_at?: string
          source_page: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_via?: string | null
          customer_anon_id?: string | null
          driver_user_id?: string
          id?: string
          pinged_at?: string
          source_page?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_contact_pings_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_places: {
        Row: {
          created_at: string
          display_order: number
          driver_user_id: string
          note: string | null
          place_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          driver_user_id: string
          note?: string | null
          place_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          driver_user_id?: string
          note?: string | null
          place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_places_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_places_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "drivers_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_push_tokens: {
        Row: {
          created_at: string
          device_label: string | null
          driver_user_id: string
          id: string
          last_seen_at: string
          platform: string
          token: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          driver_user_id: string
          id?: string
          last_seen_at?: string
          platform: string
          token: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          driver_user_id?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_push_tokens_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_referral_rewards: {
        Row: {
          created_at: string
          granted_at: string | null
          id: string
          months_granted: number
          referred_driver_id: string
          referrer_driver_id: string
          status: string
        }
        Insert: {
          created_at?: string
          granted_at?: string | null
          id?: string
          months_granted?: number
          referred_driver_id: string
          referrer_driver_id: string
          status?: string
        }
        Update: {
          created_at?: string
          granted_at?: string | null
          id?: string
          months_granted?: number
          referred_driver_id?: string
          referrer_driver_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_referral_rewards_referred_driver_id_fkey"
            columns: ["referred_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_referral_rewards_referrer_driver_id_fkey"
            columns: ["referrer_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_renewals: {
        Row: {
          bpjs_kes_paid_until: string | null
          bpjs_tk_paid_until: string | null
          driver_user_id: string
          pkb_due_on: string | null
          pramuwisata_expires_on: string | null
          sim_c_expires_on: string | null
          stnk_expires_on: string | null
          updated_at: string
        }
        Insert: {
          bpjs_kes_paid_until?: string | null
          bpjs_tk_paid_until?: string | null
          driver_user_id: string
          pkb_due_on?: string | null
          pramuwisata_expires_on?: string | null
          sim_c_expires_on?: string | null
          stnk_expires_on?: string | null
          updated_at?: string
        }
        Update: {
          bpjs_kes_paid_until?: string | null
          bpjs_tk_paid_until?: string | null
          driver_user_id?: string
          pkb_due_on?: string | null
          pramuwisata_expires_on?: string | null
          sim_c_expires_on?: string | null
          stnk_expires_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_renewals_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_renewals_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: true
            referencedRelation: "drivers_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_rides_log: {
        Row: {
          amount_idr: number
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          distance_km: number | null
          driver_user_id: string
          dropoff_label: string | null
          id: string
          notes: string | null
          pickup_label: string | null
          pitstop_note: string | null
          ride_date: string
          service: string | null
          updated_at: string
        }
        Insert: {
          amount_idr?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          distance_km?: number | null
          driver_user_id: string
          dropoff_label?: string | null
          id?: string
          notes?: string | null
          pickup_label?: string | null
          pitstop_note?: string | null
          ride_date?: string
          service?: string | null
          updated_at?: string
        }
        Update: {
          amount_idr?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          distance_km?: number | null
          driver_user_id?: string
          dropoff_label?: string | null
          id?: string
          notes?: string | null
          pickup_label?: string | null
          pitstop_note?: string | null
          ride_date?: string
          service?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_rides_log_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_rides_log_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "drivers_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      driver_tour_packages: {
        Row: {
          created_at: string
          description: string | null
          driver_id: string
          duration_hours: number
          excludes: string[]
          id: string
          includes: string[]
          max_pax: number | null
          photo_url: string | null
          place_slugs: string[]
          price_idr: number
          published: boolean
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          driver_id: string
          duration_hours: number
          excludes?: string[]
          id?: string
          includes?: string[]
          max_pax?: number | null
          photo_url?: string | null
          place_slugs?: string[]
          price_idr: number
          published?: boolean
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          driver_id?: string
          duration_hours?: number
          excludes?: string[]
          id?: string
          includes?: string[]
          max_pax?: number | null
          photo_url?: string | null
          place_slugs?: string[]
          price_idr?: number
          published?: boolean
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_tour_packages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "driver_tour_packages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      drivers: {
        Row: {
          accepts_cash: boolean
          accepts_qr: boolean
          accepts_transfer: boolean
          area: string | null
          availability: string
          available_daytime: boolean
          available_evening: boolean
          available_nightlife: boolean
          available_sunrise: boolean
          b2b_score: number | null
          b2b_score_updated_at: string | null
          b2b_tier: string | null
          bike_cc: number | null
          bike_color: string | null
          bike_make: string | null
          bike_model: string | null
          bike_photo_url: string | null
          bike_plate: string | null
          bike_type: string | null
          bike_year: number | null
          bio: string | null
          booking_alerts_consented_at: string | null
          booking_alerts_enabled: boolean
          brand_logo_url: string | null
          business_contract_enabled: boolean
          business_enabled_at: string | null
          business_max_parcels_per_day: number | null
          business_name: string
          business_notes: string | null
          business_services: string[]
          city: string | null
          cover_image_url: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          current_location_updated_at: string | null
          district_id: string | null
          faq_enabled: boolean
          faq_items: Json
          has_box: boolean
          hourly_3h_rate_idr: number | null
          hourly_6h_rate_idr: number | null
          hourly_8h_rate_idr: number | null
          hourly_enabled: boolean
          languages: string[]
          last_active_at: string | null
          legal_privacy: string | null
          legal_terms: string | null
          min_fee: number
          online_until: string | null
          paid_until: string | null
          parcel_b2b_enabled: boolean
          parcel_daily_capacity: number | null
          parcel_outer_zone_surcharge: number | null
          parcel_rate_tiers: Json | null
          parcel_service_zone: string | null
          partner_program_status: string
          partner_suspended_at: string | null
          partner_suspended_reason: string | null
          pitstop_fee: number
          price_per_km: number
          province_id: string | null
          qr_payment_url: string | null
          rating: number | null
          rating_count: number
          referral_code: string | null
          referrer_agent_code: string | null
          referrer_driver_id: string | null
          regency_id: string | null
          rental_daily_rate_idr: number | null
          rental_min_days: number
          rental_monthly_rate_idr: number | null
          rental_type: string | null
          rental_weekly_rate_idr: number | null
          service_offerings: string[]
          service_zone_center_lat: number | null
          service_zone_center_lng: number | null
          service_zone_radius_km: number | null
          services: string[]
          session_started_at: string | null
          slug: string
          status: string
          tour_guide_day_rate_idr: number | null
          tour_guide_enabled: boolean
          tour_guide_enabled_at: string | null
          tour_guide_languages: string[]
          tour_guide_notes: string | null
          transfer_details: string | null
          trips_count: number
          updated_at: string
          user_id: string
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_photos: Json
          vehicle_plate: string | null
          vehicle_seats: number | null
          vehicle_type: string
          vehicle_year: number | null
          village_id: string | null
          whatsapp_e164: string
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          accepts_cash?: boolean
          accepts_qr?: boolean
          accepts_transfer?: boolean
          area?: string | null
          availability?: string
          available_daytime?: boolean
          available_evening?: boolean
          available_nightlife?: boolean
          available_sunrise?: boolean
          b2b_score?: number | null
          b2b_score_updated_at?: string | null
          b2b_tier?: string | null
          bike_cc?: number | null
          bike_color?: string | null
          bike_make?: string | null
          bike_model?: string | null
          bike_photo_url?: string | null
          bike_plate?: string | null
          bike_type?: string | null
          bike_year?: number | null
          bio?: string | null
          booking_alerts_consented_at?: string | null
          booking_alerts_enabled?: boolean
          brand_logo_url?: string | null
          business_contract_enabled?: boolean
          business_enabled_at?: string | null
          business_max_parcels_per_day?: number | null
          business_name: string
          business_notes?: string | null
          business_services?: string[]
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          current_location_updated_at?: string | null
          district_id?: string | null
          faq_enabled?: boolean
          faq_items?: Json
          has_box?: boolean
          hourly_3h_rate_idr?: number | null
          hourly_6h_rate_idr?: number | null
          hourly_8h_rate_idr?: number | null
          hourly_enabled?: boolean
          languages?: string[]
          last_active_at?: string | null
          legal_privacy?: string | null
          legal_terms?: string | null
          min_fee: number
          online_until?: string | null
          paid_until?: string | null
          parcel_b2b_enabled?: boolean
          parcel_daily_capacity?: number | null
          parcel_outer_zone_surcharge?: number | null
          parcel_rate_tiers?: Json | null
          parcel_service_zone?: string | null
          partner_program_status?: string
          partner_suspended_at?: string | null
          partner_suspended_reason?: string | null
          pitstop_fee?: number
          price_per_km: number
          province_id?: string | null
          qr_payment_url?: string | null
          rating?: number | null
          rating_count?: number
          referral_code?: string | null
          referrer_agent_code?: string | null
          referrer_driver_id?: string | null
          regency_id?: string | null
          rental_daily_rate_idr?: number | null
          rental_min_days?: number
          rental_monthly_rate_idr?: number | null
          rental_type?: string | null
          rental_weekly_rate_idr?: number | null
          service_offerings?: string[]
          service_zone_center_lat?: number | null
          service_zone_center_lng?: number | null
          service_zone_radius_km?: number | null
          services?: string[]
          session_started_at?: string | null
          slug: string
          status?: string
          tour_guide_day_rate_idr?: number | null
          tour_guide_enabled?: boolean
          tour_guide_enabled_at?: string | null
          tour_guide_languages?: string[]
          tour_guide_notes?: string | null
          transfer_details?: string | null
          trips_count?: number
          updated_at?: string
          user_id: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photos?: Json
          vehicle_plate?: string | null
          vehicle_seats?: number | null
          vehicle_type?: string
          vehicle_year?: number | null
          village_id?: string | null
          whatsapp_e164: string
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          accepts_cash?: boolean
          accepts_qr?: boolean
          accepts_transfer?: boolean
          area?: string | null
          availability?: string
          available_daytime?: boolean
          available_evening?: boolean
          available_nightlife?: boolean
          available_sunrise?: boolean
          b2b_score?: number | null
          b2b_score_updated_at?: string | null
          b2b_tier?: string | null
          bike_cc?: number | null
          bike_color?: string | null
          bike_make?: string | null
          bike_model?: string | null
          bike_photo_url?: string | null
          bike_plate?: string | null
          bike_type?: string | null
          bike_year?: number | null
          bio?: string | null
          booking_alerts_consented_at?: string | null
          booking_alerts_enabled?: boolean
          brand_logo_url?: string | null
          business_contract_enabled?: boolean
          business_enabled_at?: string | null
          business_max_parcels_per_day?: number | null
          business_name?: string
          business_notes?: string | null
          business_services?: string[]
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          current_location_updated_at?: string | null
          district_id?: string | null
          faq_enabled?: boolean
          faq_items?: Json
          has_box?: boolean
          hourly_3h_rate_idr?: number | null
          hourly_6h_rate_idr?: number | null
          hourly_8h_rate_idr?: number | null
          hourly_enabled?: boolean
          languages?: string[]
          last_active_at?: string | null
          legal_privacy?: string | null
          legal_terms?: string | null
          min_fee?: number
          online_until?: string | null
          paid_until?: string | null
          parcel_b2b_enabled?: boolean
          parcel_daily_capacity?: number | null
          parcel_outer_zone_surcharge?: number | null
          parcel_rate_tiers?: Json | null
          parcel_service_zone?: string | null
          partner_program_status?: string
          partner_suspended_at?: string | null
          partner_suspended_reason?: string | null
          pitstop_fee?: number
          price_per_km?: number
          province_id?: string | null
          qr_payment_url?: string | null
          rating?: number | null
          rating_count?: number
          referral_code?: string | null
          referrer_agent_code?: string | null
          referrer_driver_id?: string | null
          regency_id?: string | null
          rental_daily_rate_idr?: number | null
          rental_min_days?: number
          rental_monthly_rate_idr?: number | null
          rental_type?: string | null
          rental_weekly_rate_idr?: number | null
          service_offerings?: string[]
          service_zone_center_lat?: number | null
          service_zone_center_lng?: number | null
          service_zone_radius_km?: number | null
          services?: string[]
          session_started_at?: string | null
          slug?: string
          status?: string
          tour_guide_day_rate_idr?: number | null
          tour_guide_enabled?: boolean
          tour_guide_enabled_at?: string | null
          tour_guide_languages?: string[]
          tour_guide_notes?: string | null
          transfer_details?: string | null
          trips_count?: number
          updated_at?: string
          user_id?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photos?: Json
          vehicle_plate?: string | null
          vehicle_seats?: number | null
          vehicle_type?: string
          vehicle_year?: number | null
          village_id?: string | null
          whatsapp_e164?: string
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_referrer_driver_id_fkey"
            columns: ["referrer_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_regency_id_fkey"
            columns: ["regency_id"]
            isOneToOne: false
            referencedRelation: "regencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      facial_providers: {
        Row: {
          availability: string
          avatar_frame_style: string | null
          bio: string
          busy_dates: string[] | null
          certifications: string[] | null
          city: string | null
          contact_email: string | null
          contact_form_enabled: boolean
          country_code: string | null
          cover_image_url: string | null
          created_at: string
          cta_button_effect: string | null
          custom_services_offered: string[]
          display_name: string
          facebook_url: string | null
          faq_enabled: boolean
          faq_items: Json
          gallery_image_urls: string[] | null
          gender: string
          has_physical_location: boolean
          hero_text: Json | null
          id: string
          instagram_url: string | null
          is_mock: boolean
          kakaotalk_id: string | null
          languages: string[] | null
          last_active_at: string | null
          latitude: number | null
          legal_privacy: string | null
          legal_terms: string | null
          line_id: string | null
          longitude: number | null
          marketplace_categories: string[]
          midtrans_client_key: string | null
          midtrans_is_production: boolean
          midtrans_server_key_enc: string | null
          mock_hidden_at: string | null
          operating_hours: Json | null
          paid_until: string | null
          payment_provider: string
          price_120min_idr: number | null
          price_60min_idr: number | null
          price_90min_idr: number | null
          profile_image_url: string | null
          promo_text: string | null
          service_area_notes: string | null
          service_locations: string[] | null
          service_photos: Json
          services_offered: string[]
          slug: string
          snapchat_url: string | null
          status: string
          stripe_publishable_key: string | null
          stripe_secret_key_enc: string | null
          subscription_status: string
          telegram_handle: string | null
          theme_color: string | null
          tiktok_url: string | null
          trial_ends_at: string
          updated_at: string
          user_id: string | null
          website_url: string | null
          wechat_id: string | null
          whatsapp_e164: string
          x_url: string | null
          years_experience: number
        }
        Insert: {
          availability?: string
          avatar_frame_style?: string | null
          bio?: string
          busy_dates?: string[] | null
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string
          cta_button_effect?: string | null
          custom_services_offered?: string[]
          display_name: string
          facebook_url?: string | null
          faq_enabled?: boolean
          faq_items?: Json
          gallery_image_urls?: string[] | null
          gender?: string
          has_physical_location?: boolean
          hero_text?: Json | null
          id?: string
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          legal_privacy?: string | null
          legal_terms?: string | null
          line_id?: string | null
          longitude?: number | null
          marketplace_categories?: string[]
          midtrans_client_key?: string | null
          midtrans_is_production?: boolean
          midtrans_server_key_enc?: string | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          payment_provider?: string
          price_120min_idr?: number | null
          price_60min_idr?: number | null
          price_90min_idr?: number | null
          profile_image_url?: string | null
          promo_text?: string | null
          service_area_notes?: string | null
          service_locations?: string[] | null
          service_photos?: Json
          services_offered?: string[]
          slug: string
          snapchat_url?: string | null
          status?: string
          stripe_publishable_key?: string | null
          stripe_secret_key_enc?: string | null
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164: string
          x_url?: string | null
          years_experience?: number
        }
        Update: {
          availability?: string
          avatar_frame_style?: string | null
          bio?: string
          busy_dates?: string[] | null
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string
          cta_button_effect?: string | null
          custom_services_offered?: string[]
          display_name?: string
          facebook_url?: string | null
          faq_enabled?: boolean
          faq_items?: Json
          gallery_image_urls?: string[] | null
          gender?: string
          has_physical_location?: boolean
          hero_text?: Json | null
          id?: string
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          legal_privacy?: string | null
          legal_terms?: string | null
          line_id?: string | null
          longitude?: number | null
          marketplace_categories?: string[]
          midtrans_client_key?: string | null
          midtrans_is_production?: boolean
          midtrans_server_key_enc?: string | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          payment_provider?: string
          price_120min_idr?: number | null
          price_60min_idr?: number | null
          price_90min_idr?: number | null
          profile_image_url?: string | null
          promo_text?: string | null
          service_area_notes?: string | null
          service_locations?: string[] | null
          service_photos?: Json
          services_offered?: string[]
          slug?: string
          snapchat_url?: string | null
          status?: string
          stripe_publishable_key?: string | null
          stripe_secret_key_enc?: string | null
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164?: string
          x_url?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      handyman_bookings: {
        Row: {
          created_at: string
          customer_name: string
          customer_whatsapp: string
          handyman_id: string
          id: string
          notes: string | null
          requested_date: string
          requested_time: string
          service_name: string | null
          status: string
          submitter_ip_hash: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          handyman_id: string
          id?: string
          notes?: string | null
          requested_date: string
          requested_time: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          handyman_id?: string
          id?: string
          notes?: string | null
          requested_date?: string
          requested_time?: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "handyman_bookings_handyman_id_fkey"
            columns: ["handyman_id"]
            isOneToOne: false
            referencedRelation: "handyman_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      handyman_providers: {
        Row: {
          availability: string
          bio: string
          busy_dates: string[]
          busy_time_slots: Json
          certifications: string[] | null
          city: string | null
          contact_email: string | null
          contact_form_enabled: boolean
          country_code: string
          cover_image_url: string | null
          created_at: string
          custom_services_offered: string[] | null
          day_rate_idr: number | null
          display_name: string
          facebook_url: string | null
          gallery_image_urls: string[] | null
          has_own_tools: boolean
          has_physical_location: boolean
          hero_text: Json | null
          hourly_rate_idr: number | null
          id: string
          inquiry_count: number
          instagram_url: string | null
          is_mock: boolean
          kakaotalk_id: string | null
          ktp_image_url: string | null
          languages: string[] | null
          last_active_at: string | null
          latitude: number | null
          line_id: string | null
          longitude: number | null
          mock_hidden_at: string | null
          operating_hours: Json | null
          paid_until: string | null
          profile_image_url: string | null
          promo_text: string | null
          rating: number | null
          rating_count: number
          rejected_reason: string | null
          service_area_notes: string | null
          service_photos: Json
          slug: string
          snapchat_url: string | null
          specialties: string[]
          status: string
          subscription_status: string
          telegram_handle: string | null
          theme_color: string | null
          tiktok_url: string | null
          trial_ends_at: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
          visitor_count: number
          website_url: string | null
          wechat_id: string | null
          whatsapp_e164: string
          x_url: string | null
          years_experience: number
        }
        Insert: {
          availability?: string
          bio: string
          busy_dates?: string[]
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          day_rate_idr?: number | null
          display_name: string
          facebook_url?: string | null
          gallery_image_urls?: string[] | null
          has_own_tools?: boolean
          has_physical_location?: boolean
          hero_text?: Json | null
          hourly_rate_idr?: number | null
          id?: string
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          ktp_image_url?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          line_id?: string | null
          longitude?: number | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rating_count?: number
          rejected_reason?: string | null
          service_area_notes?: string | null
          service_photos?: Json
          slug: string
          snapchat_url?: string | null
          specialties?: string[]
          status?: string
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164: string
          x_url?: string | null
          years_experience?: number
        }
        Update: {
          availability?: string
          bio?: string
          busy_dates?: string[]
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          day_rate_idr?: number | null
          display_name?: string
          facebook_url?: string | null
          gallery_image_urls?: string[] | null
          has_own_tools?: boolean
          has_physical_location?: boolean
          hero_text?: Json | null
          hourly_rate_idr?: number | null
          id?: string
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          ktp_image_url?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          line_id?: string | null
          longitude?: number | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rating_count?: number
          rejected_reason?: string | null
          service_area_notes?: string | null
          service_photos?: Json
          slug?: string
          snapchat_url?: string | null
          specialties?: string[]
          status?: string
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164?: string
          x_url?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      home_clean_bookings: {
        Row: {
          created_at: string
          customer_name: string
          customer_whatsapp: string
          home_clean_id: string
          id: string
          notes: string | null
          requested_date: string
          requested_time: string
          service_name: string | null
          status: string
          submitter_ip_hash: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          home_clean_id: string
          id?: string
          notes?: string | null
          requested_date: string
          requested_time: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          home_clean_id?: string
          id?: string
          notes?: string | null
          requested_date?: string
          requested_time?: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_clean_bookings_home_clean_id_fkey"
            columns: ["home_clean_id"]
            isOneToOne: false
            referencedRelation: "home_clean_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      home_clean_providers: {
        Row: {
          availability: string
          bio: string
          busy_dates: string[]
          busy_time_slots: Json
          certifications: string[] | null
          city: string | null
          contact_email: string | null
          contact_form_enabled: boolean
          country_code: string
          cover_image_url: string | null
          created_at: string
          custom_services_offered: string[] | null
          day_rate_idr: number | null
          display_name: string
          eco_friendly: boolean | null
          facebook_url: string | null
          gallery_image_urls: string[] | null
          has_own_supplies: boolean | null
          has_physical_location: boolean
          hero_text: Json | null
          hourly_rate_idr: number | null
          id: string
          inquiry_count: number
          instagram_url: string | null
          is_mock: boolean
          kakaotalk_id: string | null
          ktp_image_url: string | null
          languages: string[] | null
          last_active_at: string | null
          latitude: number | null
          line_id: string | null
          longitude: number | null
          mock_hidden_at: string | null
          operating_hours: Json | null
          paid_until: string | null
          profile_image_url: string | null
          promo_text: string | null
          rating: number | null
          rating_count: number
          rejected_reason: string | null
          service_area_notes: string | null
          service_photos: Json | null
          services_offered: string[]
          slug: string
          snapchat_url: string | null
          status: string
          subscription_status: string
          team_size: number | null
          telegram_handle: string | null
          theme_color: string | null
          tiktok_url: string | null
          trial_ends_at: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
          visitor_count: number
          website_url: string | null
          wechat_id: string | null
          whatsapp_e164: string
          x_url: string | null
          years_experience: number
        }
        Insert: {
          availability?: string
          bio: string
          busy_dates?: string[]
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          day_rate_idr?: number | null
          display_name: string
          eco_friendly?: boolean | null
          facebook_url?: string | null
          gallery_image_urls?: string[] | null
          has_own_supplies?: boolean | null
          has_physical_location?: boolean
          hero_text?: Json | null
          hourly_rate_idr?: number | null
          id?: string
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          ktp_image_url?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          line_id?: string | null
          longitude?: number | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rating_count?: number
          rejected_reason?: string | null
          service_area_notes?: string | null
          service_photos?: Json | null
          services_offered?: string[]
          slug: string
          snapchat_url?: string | null
          status?: string
          subscription_status?: string
          team_size?: number | null
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164: string
          x_url?: string | null
          years_experience?: number
        }
        Update: {
          availability?: string
          bio?: string
          busy_dates?: string[]
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          day_rate_idr?: number | null
          display_name?: string
          eco_friendly?: boolean | null
          facebook_url?: string | null
          gallery_image_urls?: string[] | null
          has_own_supplies?: boolean | null
          has_physical_location?: boolean
          hero_text?: Json | null
          hourly_rate_idr?: number | null
          id?: string
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          ktp_image_url?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          line_id?: string | null
          longitude?: number | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rating_count?: number
          rejected_reason?: string | null
          service_area_notes?: string | null
          service_photos?: Json | null
          services_offered?: string[]
          slug?: string
          snapchat_url?: string | null
          status?: string
          subscription_status?: string
          team_size?: number | null
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164?: string
          x_url?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      laundry_bookings: {
        Row: {
          created_at: string
          customer_name: string
          customer_whatsapp: string
          id: string
          laundry_id: string
          notes: string | null
          requested_date: string
          requested_time: string
          service_name: string | null
          status: string
          submitter_ip_hash: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          id?: string
          laundry_id: string
          notes?: string | null
          requested_date: string
          requested_time: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          id?: string
          laundry_id?: string
          notes?: string | null
          requested_date?: string
          requested_time?: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laundry_bookings_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundry_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_providers: {
        Row: {
          availability: string
          bio: string
          busy_time_slots: Json
          certifications: string[] | null
          city: string | null
          contact_email: string | null
          contact_form_enabled: boolean
          country_code: string
          cover_image_url: string | null
          created_at: string
          custom_services_offered: string[] | null
          display_name: string
          facebook_url: string | null
          gallery_image_urls: string[] | null
          has_physical_location: boolean
          hero_text: Json | null
          id: string
          inquiry_count: number
          instagram_url: string | null
          is_mock: boolean
          kakaotalk_id: string | null
          ktp_image_url: string | null
          languages: string[] | null
          last_active_at: string | null
          latitude: number | null
          line_id: string | null
          longitude: number | null
          min_kg: number | null
          mock_hidden_at: string | null
          operating_hours: Json | null
          paid_until: string | null
          price_wash_dry_per_kg_idr: number | null
          price_wash_iron_per_kg_idr: number | null
          price_wash_per_kg_idr: number | null
          profile_image_url: string | null
          promo_text: string | null
          rating: number | null
          rating_count: number
          rejected_reason: string | null
          service_area_notes: string | null
          slug: string
          snapchat_url: string | null
          status: string
          subscription_status: string
          telegram_handle: string | null
          theme_color: string | null
          tiktok_url: string | null
          trial_ends_at: string
          turnaround_hours: number | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
          visitor_count: number
          website_url: string | null
          wechat_id: string | null
          whatsapp_e164: string
          x_url: string | null
          years_experience: number
        }
        Insert: {
          availability?: string
          bio: string
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          display_name: string
          facebook_url?: string | null
          gallery_image_urls?: string[] | null
          has_physical_location?: boolean
          hero_text?: Json | null
          id?: string
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          ktp_image_url?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          line_id?: string | null
          longitude?: number | null
          min_kg?: number | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          price_wash_dry_per_kg_idr?: number | null
          price_wash_iron_per_kg_idr?: number | null
          price_wash_per_kg_idr?: number | null
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rating_count?: number
          rejected_reason?: string | null
          service_area_notes?: string | null
          slug: string
          snapchat_url?: string | null
          status?: string
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          turnaround_hours?: number | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164: string
          x_url?: string | null
          years_experience?: number
        }
        Update: {
          availability?: string
          bio?: string
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          display_name?: string
          facebook_url?: string | null
          gallery_image_urls?: string[] | null
          has_physical_location?: boolean
          hero_text?: Json | null
          id?: string
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          ktp_image_url?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          line_id?: string | null
          longitude?: number | null
          min_kg?: number | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          price_wash_dry_per_kg_idr?: number | null
          price_wash_iron_per_kg_idr?: number | null
          price_wash_per_kg_idr?: number | null
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rating_count?: number
          rejected_reason?: string | null
          service_area_notes?: string | null
          slug?: string
          snapchat_url?: string | null
          status?: string
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          turnaround_hours?: number | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164?: string
          x_url?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      massage_bookings: {
        Row: {
          created_at: string
          customer_name: string
          customer_whatsapp: string
          id: string
          massage_id: string
          notes: string | null
          requested_date: string
          requested_time: string
          service_name: string | null
          status: string
          submitter_ip_hash: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          id?: string
          massage_id: string
          notes?: string | null
          requested_date: string
          requested_time: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          id?: string
          massage_id?: string
          notes?: string | null
          requested_date?: string
          requested_time?: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "massage_bookings_massage_id_fkey"
            columns: ["massage_id"]
            isOneToOne: false
            referencedRelation: "massage_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      massage_providers: {
        Row: {
          availability: string
          bio: string
          busy_dates: Json | null
          busy_time_slots: Json
          certifications: string[] | null
          city: string | null
          contact_email: string | null
          contact_form_enabled: boolean
          country_code: string
          cover_image_url: string | null
          created_at: string
          custom_services_offered: string[] | null
          display_name: string
          facebook_url: string | null
          gallery_image_urls: string[] | null
          gender: string
          has_physical_location: boolean | null
          hero_text: Json | null
          id: string
          inquiry_count: number
          instagram_url: string | null
          is_mock: boolean
          kakaotalk_id: string | null
          ktp_image_url: string | null
          languages: string[] | null
          last_active_at: string | null
          latitude: number | null
          line_id: string | null
          longitude: number | null
          marketplace_categories: string[] | null
          massage_type: string
          mock_hidden_at: string | null
          operating_hours: Json | null
          paid_until: string | null
          price_120min_idr: number
          price_60min_idr: number
          price_90min_idr: number
          profile_image_url: string | null
          promo_text: string | null
          rating: number | null
          rating_count: number
          rejected_reason: string | null
          service_area_notes: string | null
          service_locations: string[] | null
          service_photos: Json | null
          slug: string
          snapchat_url: string | null
          status: string
          subscription_status: string
          telegram_handle: string | null
          theme_color: string | null
          tiktok_url: string | null
          trial_ends_at: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
          visitor_count: number
          website_url: string | null
          wechat_id: string | null
          whatsapp_e164: string
          x_url: string | null
          years_experience: number
        }
        Insert: {
          availability?: string
          bio: string
          busy_dates?: Json | null
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          display_name: string
          facebook_url?: string | null
          gallery_image_urls?: string[] | null
          gender: string
          has_physical_location?: boolean | null
          hero_text?: Json | null
          id?: string
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          ktp_image_url?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          line_id?: string | null
          longitude?: number | null
          marketplace_categories?: string[] | null
          massage_type?: string
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          price_120min_idr: number
          price_60min_idr: number
          price_90min_idr: number
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rating_count?: number
          rejected_reason?: string | null
          service_area_notes?: string | null
          service_locations?: string[] | null
          service_photos?: Json | null
          slug: string
          snapchat_url?: string | null
          status?: string
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164: string
          x_url?: string | null
          years_experience?: number
        }
        Update: {
          availability?: string
          bio?: string
          busy_dates?: Json | null
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          display_name?: string
          facebook_url?: string | null
          gallery_image_urls?: string[] | null
          gender?: string
          has_physical_location?: boolean | null
          hero_text?: Json | null
          id?: string
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          ktp_image_url?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          line_id?: string | null
          longitude?: number | null
          marketplace_categories?: string[] | null
          massage_type?: string
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          price_120min_idr?: number
          price_60min_idr?: number
          price_90min_idr?: number
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rating_count?: number
          rejected_reason?: string | null
          service_area_notes?: string | null
          service_locations?: string[] | null
          service_photos?: Json | null
          slug?: string
          snapchat_url?: string | null
          status?: string
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164?: string
          x_url?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      mock_bike_rentals: {
        Row: {
          available_now: boolean
          bike_type: string | null
          brand: string
          cc: number | null
          city: string | null
          color: string | null
          created_at: string
          daily_price_idr: number
          id: string
          image_urls: string[]
          mock_hidden_at: string | null
          model: string
          monthly_price_idr: number | null
          owner_name: string
          owner_whatsapp_e164: string
          rating: number | null
          security_deposit_idr: number | null
          slug: string
          transmission: string | null
          weekly_price_idr: number | null
          year: number | null
        }
        Insert: {
          available_now?: boolean
          bike_type?: string | null
          brand: string
          cc?: number | null
          city?: string | null
          color?: string | null
          created_at?: string
          daily_price_idr: number
          id?: string
          image_urls?: string[]
          mock_hidden_at?: string | null
          model: string
          monthly_price_idr?: number | null
          owner_name: string
          owner_whatsapp_e164: string
          rating?: number | null
          security_deposit_idr?: number | null
          slug: string
          transmission?: string | null
          weekly_price_idr?: number | null
          year?: number | null
        }
        Update: {
          available_now?: boolean
          bike_type?: string | null
          brand?: string
          cc?: number | null
          city?: string | null
          color?: string | null
          created_at?: string
          daily_price_idr?: number
          id?: string
          image_urls?: string[]
          mock_hidden_at?: string | null
          model?: string
          monthly_price_idr?: number | null
          owner_name?: string
          owner_whatsapp_e164?: string
          rating?: number | null
          security_deposit_idr?: number | null
          slug?: string
          transmission?: string | null
          weekly_price_idr?: number | null
          year?: number | null
        }
        Relationships: []
      }
      mock_drivers: {
        Row: {
          area: string | null
          availability: string
          bike_make: string | null
          bike_model: string | null
          bike_type: string | null
          bike_year: number | null
          bio: string | null
          business_name: string
          city: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          min_fee: number
          mock_hidden_at: string | null
          price_per_km: number
          profile_image_url: string | null
          rating: number | null
          rental_daily_rate_idr: number | null
          rental_min_days: number
          rental_monthly_rate_idr: number | null
          rental_type: string | null
          rental_weekly_rate_idr: number | null
          service_offerings: string[]
          services: string[]
          slug: string
          trips_count: number
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_photos: Json
          vehicle_plate: string | null
          vehicle_seats: number | null
          vehicle_type: string
          vehicle_year: number | null
          whatsapp_e164: string
        }
        Insert: {
          area?: string | null
          availability?: string
          bike_make?: string | null
          bike_model?: string | null
          bike_type?: string | null
          bike_year?: number | null
          bio?: string | null
          business_name: string
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          min_fee?: number
          mock_hidden_at?: string | null
          price_per_km?: number
          profile_image_url?: string | null
          rating?: number | null
          rental_daily_rate_idr?: number | null
          rental_min_days?: number
          rental_monthly_rate_idr?: number | null
          rental_type?: string | null
          rental_weekly_rate_idr?: number | null
          service_offerings?: string[]
          services?: string[]
          slug: string
          trips_count?: number
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photos?: Json
          vehicle_plate?: string | null
          vehicle_seats?: number | null
          vehicle_type?: string
          vehicle_year?: number | null
          whatsapp_e164: string
        }
        Update: {
          area?: string | null
          availability?: string
          bike_make?: string | null
          bike_model?: string | null
          bike_type?: string | null
          bike_year?: number | null
          bio?: string | null
          business_name?: string
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          min_fee?: number
          mock_hidden_at?: string | null
          price_per_km?: number
          profile_image_url?: string | null
          rating?: number | null
          rental_daily_rate_idr?: number | null
          rental_min_days?: number
          rental_monthly_rate_idr?: number | null
          rental_type?: string | null
          rental_weekly_rate_idr?: number | null
          service_offerings?: string[]
          services?: string[]
          slug?: string
          trips_count?: number
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photos?: Json
          vehicle_plate?: string | null
          vehicle_seats?: number | null
          vehicle_type?: string
          vehicle_year?: number | null
          whatsapp_e164?: string
        }
        Relationships: []
      }
      mock_tour_guide_listings: {
        Row: {
          address: string | null
          availability: string
          available_now: boolean
          bike_brand: string
          city: string | null
          created_at: string
          day_rate_idr: number
          fuel_included: boolean
          id: string
          image_urls: string[]
          languages: string[]
          mock_hidden_at: string | null
          name: string
          notes: string | null
          rating: number | null
          services: string[]
          slug: string
          whatsapp_e164: string
        }
        Insert: {
          address?: string | null
          availability?: string
          available_now?: boolean
          bike_brand?: string
          city?: string | null
          created_at?: string
          day_rate_idr: number
          fuel_included?: boolean
          id?: string
          image_urls?: string[]
          languages?: string[]
          mock_hidden_at?: string | null
          name: string
          notes?: string | null
          rating?: number | null
          services?: string[]
          slug: string
          whatsapp_e164: string
        }
        Update: {
          address?: string | null
          availability?: string
          available_now?: boolean
          bike_brand?: string
          city?: string | null
          created_at?: string
          day_rate_idr?: number
          fuel_included?: boolean
          id?: string
          image_urls?: string[]
          languages?: string[]
          mock_hidden_at?: string | null
          name?: string
          notes?: string | null
          rating?: number | null
          services?: string[]
          slug?: string
          whatsapp_e164?: string
        }
        Relationships: []
      }
      outreach_contacts: {
        Row: {
          business_name: string
          category: string
          city: string | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          email: string | null
          id: string
          last_touch_at: string | null
          notes: string | null
          owner_user_id: string | null
          source: string | null
          status: string
          touch_count: number
          updated_at: string
          website: string | null
          whatsapp_e164: string | null
        }
        Insert: {
          business_name: string
          category: string
          city?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_touch_at?: string | null
          notes?: string | null
          owner_user_id?: string | null
          source?: string | null
          status?: string
          touch_count?: number
          updated_at?: string
          website?: string | null
          whatsapp_e164?: string | null
        }
        Update: {
          business_name?: string
          category?: string
          city?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_touch_at?: string | null
          notes?: string | null
          owner_user_id?: string | null
          source?: string | null
          status?: string
          touch_count?: number
          updated_at?: string
          website?: string | null
          whatsapp_e164?: string | null
        }
        Relationships: []
      }
      partner_bookings: {
        Row: {
          commission_idr: number
          created_at: string
          dispute_reason: string | null
          driver_user_id: string
          dropoff_name: string | null
          due_at: string
          fare_idr: number
          id: string
          partner_id: string
          pickup_name: string | null
          proof_amount_idr: number | null
          proof_image_url: string | null
          proof_method: string | null
          proof_uploaded_at: string | null
          proof_uploaded_by: string | null
          reject_at: string | null
          reject_reason: string | null
          rider_anon_id: string | null
          service_type: string | null
          settled_at: string | null
          settled_by: string | null
          status: string
        }
        Insert: {
          commission_idr: number
          created_at?: string
          dispute_reason?: string | null
          driver_user_id: string
          dropoff_name?: string | null
          due_at?: string
          fare_idr: number
          id?: string
          partner_id: string
          pickup_name?: string | null
          proof_amount_idr?: number | null
          proof_image_url?: string | null
          proof_method?: string | null
          proof_uploaded_at?: string | null
          proof_uploaded_by?: string | null
          reject_at?: string | null
          reject_reason?: string | null
          rider_anon_id?: string | null
          service_type?: string | null
          settled_at?: string | null
          settled_by?: string | null
          status?: string
        }
        Update: {
          commission_idr?: number
          created_at?: string
          dispute_reason?: string | null
          driver_user_id?: string
          dropoff_name?: string | null
          due_at?: string
          fare_idr?: number
          id?: string
          partner_id?: string
          pickup_name?: string | null
          proof_amount_idr?: number | null
          proof_image_url?: string | null
          proof_method?: string | null
          proof_uploaded_at?: string | null
          proof_uploaded_by?: string | null
          reject_at?: string | null
          reject_reason?: string | null
          rider_anon_id?: string | null
          service_type?: string | null
          settled_at?: string | null
          settled_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_bookings_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_bookings_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "drivers_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_bookings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          city: string | null
          commission_rate: number
          contact_email: string
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          owner_user_id: string | null
          partner_type: string
          payout_account_name: string | null
          payout_account_number: string | null
          payout_bank_code: string | null
          payout_method: string | null
          payout_notes: string | null
          payout_qris_image_url: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          commission_rate?: number
          contact_email: string
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          owner_user_id?: string | null
          partner_type?: string
          payout_account_name?: string | null
          payout_account_number?: string | null
          payout_bank_code?: string | null
          payout_method?: string | null
          payout_notes?: string | null
          payout_qris_image_url?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          commission_rate?: number
          contact_email?: string
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          partner_type?: string
          payout_account_name?: string | null
          payout_account_number?: string | null
          payout_bank_code?: string | null
          payout_method?: string | null
          payout_notes?: string | null
          payout_qris_image_url?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount_idr: number
          created_at: string
          driver_user_id: string
          extends_days: number
          id: string
          paid_at: string | null
          product: string
          provider: string
          provider_order_id: string
          provider_txn_id: string | null
          raw_notification: Json | null
          snap_redirect_url: string | null
          snap_token: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_idr: number
          created_at?: string
          driver_user_id: string
          extends_days?: number
          id?: string
          paid_at?: string | null
          product: string
          provider?: string
          provider_order_id: string
          provider_txn_id?: string | null
          raw_notification?: Json | null
          snap_redirect_url?: string | null
          snap_token?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_idr?: number
          created_at?: string
          driver_user_id?: string
          extends_days?: number
          id?: string
          paid_at?: string | null
          product?: string
          provider?: string
          provider_order_id?: string
          provider_txn_id?: string | null
          raw_notification?: Json | null
          snap_redirect_url?: string | null
          snap_token?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          amount_idr: number
          created_at: string
          id: string
          payer_note: string | null
          payer_phone: string | null
          payment_intent_id: string | null
          product: string
          qr_code_id: string | null
          receipt_url: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          amount_idr: number
          created_at?: string
          id?: string
          payer_note?: string | null
          payer_phone?: string | null
          payment_intent_id?: string | null
          product: string
          qr_code_id?: string | null
          receipt_url: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          amount_idr?: number
          created_at?: string
          id?: string
          payer_note?: string | null
          payer_phone?: string | null
          payment_intent_id?: string | null
          product?: string
          qr_code_id?: string | null
          receipt_url?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "admin_qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders_log: {
        Row: {
          channel: string
          error: string | null
          id: number
          kind: string
          period_end: string
          queued_at: string
          sent_at: string | null
          user_id: string
          wa_message: string | null
          whatsapp_number: string | null
        }
        Insert: {
          channel?: string
          error?: string | null
          id?: number
          kind: string
          period_end: string
          queued_at?: string
          sent_at?: string | null
          user_id: string
          wa_message?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          channel?: string
          error?: string | null
          id?: number
          kind?: string
          period_end?: string
          queued_at?: string
          sent_at?: string | null
          user_id?: string
          wa_message?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      place_offers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          place_id: string
          price_idr: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          place_id: string
          price_idr?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          place_id?: string
          price_idr?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_offers_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          bio: string | null
          business_name: string | null
          category: string
          certifications: string[] | null
          city: string
          contact_enabled: boolean
          cover_image_url: string | null
          created_at: string
          cuisine_types: string[]
          description: string | null
          dietary_tags: string[] | null
          facebook_url: string | null
          featured_until: string | null
          free_delivery: boolean
          hero_text: Json | null
          hours_json: Json | null
          id: string
          image_urls: string[]
          instagram_url: string | null
          languages: string[] | null
          lat: number
          listing_tier: string
          lng: number
          location: unknown
          mock_hidden_at: string | null
          name: string
          owner_user_id: string | null
          paid_until: string | null
          phone: string | null
          price_tier: string | null
          profile_image_url: string | null
          promo_text: string | null
          rating: number | null
          rejection_note: string | null
          review_count: number
          service_photos: Json | null
          slug: string
          status: string
          subcategory: string | null
          submitted_email: string | null
          submitted_name: string | null
          submitted_whatsapp: string | null
          tags: string[]
          theme_color: string | null
          tiktok_url: string | null
          updated_at: string
          verified: boolean
          website: string | null
          whatsapp_e164: string | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          business_name?: string | null
          category: string
          certifications?: string[] | null
          city: string
          contact_enabled?: boolean
          cover_image_url?: string | null
          created_at?: string
          cuisine_types?: string[]
          description?: string | null
          dietary_tags?: string[] | null
          facebook_url?: string | null
          featured_until?: string | null
          free_delivery?: boolean
          hero_text?: Json | null
          hours_json?: Json | null
          id?: string
          image_urls?: string[]
          instagram_url?: string | null
          languages?: string[] | null
          lat: number
          listing_tier?: string
          lng: number
          location: unknown
          mock_hidden_at?: string | null
          name: string
          owner_user_id?: string | null
          paid_until?: string | null
          phone?: string | null
          price_tier?: string | null
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rejection_note?: string | null
          review_count?: number
          service_photos?: Json | null
          slug: string
          status?: string
          subcategory?: string | null
          submitted_email?: string | null
          submitted_name?: string | null
          submitted_whatsapp?: string | null
          tags?: string[]
          theme_color?: string | null
          tiktok_url?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
          whatsapp_e164?: string | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          business_name?: string | null
          category?: string
          certifications?: string[] | null
          city?: string
          contact_enabled?: boolean
          cover_image_url?: string | null
          created_at?: string
          cuisine_types?: string[]
          description?: string | null
          dietary_tags?: string[] | null
          facebook_url?: string | null
          featured_until?: string | null
          free_delivery?: boolean
          hero_text?: Json | null
          hours_json?: Json | null
          id?: string
          image_urls?: string[]
          instagram_url?: string | null
          languages?: string[] | null
          lat?: number
          listing_tier?: string
          lng?: number
          location?: unknown
          mock_hidden_at?: string | null
          name?: string
          owner_user_id?: string | null
          paid_until?: string | null
          phone?: string | null
          price_tier?: string | null
          profile_image_url?: string | null
          promo_text?: string | null
          rating?: number | null
          rejection_note?: string | null
          review_count?: number
          service_photos?: Json | null
          slug?: string
          status?: string
          subcategory?: string | null
          submitted_email?: string | null
          submitted_name?: string | null
          submitted_whatsapp?: string | null
          tags?: string[]
          theme_color?: string | null
          tiktok_url?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
          whatsapp_e164?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_city_fkey"
            columns: ["city"]
            isOneToOne: false
            referencedRelation: "city_zones"
            referencedColumns: ["city"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          driver_type: string | null
          full_name: string | null
          id: string
          phone: string
          photo_url: string | null
          price_max: string | null
          price_min: string | null
          role: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          driver_type?: string | null
          full_name?: string | null
          id: string
          phone: string
          photo_url?: string | null
          price_max?: string | null
          price_min?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          driver_type?: string | null
          full_name?: string | null
          id?: string
          phone?: string
          photo_url?: string | null
          price_max?: string | null
          price_min?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      promo_pages: {
        Row: {
          ai_caption: string
          ai_caption_short: string | null
          archived_at: string | null
          badge_color: string | null
          badge_type: string | null
          badge_value: number | null
          click_count: number
          created_at: string
          expires_at: string | null
          hashtags_by_platform: Json
          headline: string
          id: string
          photo_url: string
          price_idr: number | null
          provider_id: string
          provider_type: string
          slug: string
          view_count: number
        }
        Insert: {
          ai_caption: string
          ai_caption_short?: string | null
          archived_at?: string | null
          badge_color?: string | null
          badge_type?: string | null
          badge_value?: number | null
          click_count?: number
          created_at?: string
          expires_at?: string | null
          hashtags_by_platform?: Json
          headline: string
          id?: string
          photo_url: string
          price_idr?: number | null
          provider_id: string
          provider_type: string
          slug: string
          view_count?: number
        }
        Update: {
          ai_caption?: string
          ai_caption_short?: string | null
          archived_at?: string | null
          badge_color?: string | null
          badge_type?: string | null
          badge_value?: number | null
          click_count?: number
          created_at?: string
          expires_at?: string | null
          hashtags_by_platform?: Json
          headline?: string
          id?: string
          photo_url?: string
          price_idr?: number | null
          provider_id?: string
          provider_type?: string
          slug?: string
          view_count?: number
        }
        Relationships: []
      }
      property_listings: {
        Row: {
          accepted_banks: string[] | null
          address: string | null
          agent_license_no: string | null
          bathrooms: number | null
          bedrooms: number | null
          bio: string | null
          building_size_sqm: number | null
          business_name: string | null
          certificate_type: string | null
          certifications: string[] | null
          city: string
          completion_date: string | null
          cover_image_url: string | null
          created_at: string
          daily_rent_idr: number | null
          deposit_idr: number | null
          developer_name: string | null
          display_name: string
          drone_url: string | null
          electricity_va: number | null
          expat_friendly: boolean | null
          facebook_url: string | null
          facing_direction: string | null
          flood_zone: string | null
          floors: number | null
          furnished: string | null
          gallery_image_urls: string[] | null
          has_garden: boolean | null
          has_pool: boolean | null
          hero_text: Json | null
          id: string
          image_urls: string[] | null
          inquiry_count: number
          instagram_url: string | null
          is_mock: boolean
          kakaotalk_id: string | null
          kecamatan: string | null
          kelurahan: string | null
          kpr_eligible: boolean | null
          ktp_image_url: string | null
          land_size_sqm: number | null
          languages: string[] | null
          last_active_at: string | null
          latitude: number | null
          leasehold_years_remaining: number | null
          line_id: string | null
          listing_type: string
          location: unknown
          longitude: number | null
          min_lease_months: number | null
          mock_hidden_at: string | null
          monthly_rent_idr: number | null
          nup_idr: number | null
          operating_hours: Json | null
          paid_until: string | null
          parking_bikes: number | null
          parking_cars: number | null
          preferred_ppat_name: string | null
          preferred_ppat_phone: string | null
          price_idr: number | null
          price_negotiable: boolean
          price_on_request: boolean
          profile_image_url: string | null
          promo_text: string | null
          property_type: string
          rating: number | null
          rating_count: number
          rejection_note: string | null
          service_photos: Json | null
          slug: string
          snapchat_url: string | null
          starting_price_idr: number | null
          status: string
          subscription_status: string
          tags: string[] | null
          telegram_handle: string | null
          theme_color: string | null
          tiktok_url: string | null
          transit_score: Json | null
          trial_ends_at: string | null
          units_available: number | null
          units_total: number | null
          updated_at: string
          user_id: string | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          video_url: string | null
          virtual_tour_url: string | null
          visitor_count: number
          water_source: string | null
          website_url: string | null
          wechat_id: string | null
          weekly_rent_idr: number | null
          whatsapp_e164: string
          x_url: string | null
          year_built: number | null
        }
        Insert: {
          accepted_banks?: string[] | null
          address?: string | null
          agent_license_no?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          bio?: string | null
          building_size_sqm?: number | null
          business_name?: string | null
          certificate_type?: string | null
          certifications?: string[] | null
          city: string
          completion_date?: string | null
          cover_image_url?: string | null
          created_at?: string
          daily_rent_idr?: number | null
          deposit_idr?: number | null
          developer_name?: string | null
          display_name: string
          drone_url?: string | null
          electricity_va?: number | null
          expat_friendly?: boolean | null
          facebook_url?: string | null
          facing_direction?: string | null
          flood_zone?: string | null
          floors?: number | null
          furnished?: string | null
          gallery_image_urls?: string[] | null
          has_garden?: boolean | null
          has_pool?: boolean | null
          hero_text?: Json | null
          id?: string
          image_urls?: string[] | null
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          kecamatan?: string | null
          kelurahan?: string | null
          kpr_eligible?: boolean | null
          ktp_image_url?: string | null
          land_size_sqm?: number | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          leasehold_years_remaining?: number | null
          line_id?: string | null
          listing_type: string
          location?: unknown
          longitude?: number | null
          min_lease_months?: number | null
          mock_hidden_at?: string | null
          monthly_rent_idr?: number | null
          nup_idr?: number | null
          operating_hours?: Json | null
          paid_until?: string | null
          parking_bikes?: number | null
          parking_cars?: number | null
          preferred_ppat_name?: string | null
          preferred_ppat_phone?: string | null
          price_idr?: number | null
          price_negotiable?: boolean
          price_on_request?: boolean
          profile_image_url?: string | null
          promo_text?: string | null
          property_type: string
          rating?: number | null
          rating_count?: number
          rejection_note?: string | null
          service_photos?: Json | null
          slug: string
          snapchat_url?: string | null
          starting_price_idr?: number | null
          status?: string
          subscription_status?: string
          tags?: string[] | null
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          transit_score?: Json | null
          trial_ends_at?: string | null
          units_available?: number | null
          units_total?: number | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
          virtual_tour_url?: string | null
          visitor_count?: number
          water_source?: string | null
          website_url?: string | null
          wechat_id?: string | null
          weekly_rent_idr?: number | null
          whatsapp_e164: string
          x_url?: string | null
          year_built?: number | null
        }
        Update: {
          accepted_banks?: string[] | null
          address?: string | null
          agent_license_no?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          bio?: string | null
          building_size_sqm?: number | null
          business_name?: string | null
          certificate_type?: string | null
          certifications?: string[] | null
          city?: string
          completion_date?: string | null
          cover_image_url?: string | null
          created_at?: string
          daily_rent_idr?: number | null
          deposit_idr?: number | null
          developer_name?: string | null
          display_name?: string
          drone_url?: string | null
          electricity_va?: number | null
          expat_friendly?: boolean | null
          facebook_url?: string | null
          facing_direction?: string | null
          flood_zone?: string | null
          floors?: number | null
          furnished?: string | null
          gallery_image_urls?: string[] | null
          has_garden?: boolean | null
          has_pool?: boolean | null
          hero_text?: Json | null
          id?: string
          image_urls?: string[] | null
          inquiry_count?: number
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          kecamatan?: string | null
          kelurahan?: string | null
          kpr_eligible?: boolean | null
          ktp_image_url?: string | null
          land_size_sqm?: number | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          leasehold_years_remaining?: number | null
          line_id?: string | null
          listing_type?: string
          location?: unknown
          longitude?: number | null
          min_lease_months?: number | null
          mock_hidden_at?: string | null
          monthly_rent_idr?: number | null
          nup_idr?: number | null
          operating_hours?: Json | null
          paid_until?: string | null
          parking_bikes?: number | null
          parking_cars?: number | null
          preferred_ppat_name?: string | null
          preferred_ppat_phone?: string | null
          price_idr?: number | null
          price_negotiable?: boolean
          price_on_request?: boolean
          profile_image_url?: string | null
          promo_text?: string | null
          property_type?: string
          rating?: number | null
          rating_count?: number
          rejection_note?: string | null
          service_photos?: Json | null
          slug?: string
          snapchat_url?: string | null
          starting_price_idr?: number | null
          status?: string
          subscription_status?: string
          tags?: string[] | null
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          transit_score?: Json | null
          trial_ends_at?: string | null
          units_available?: number | null
          units_total?: number | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          video_url?: string | null
          virtual_tour_url?: string | null
          visitor_count?: number
          water_source?: string | null
          website_url?: string | null
          wechat_id?: string | null
          weekly_rent_idr?: number | null
          whatsapp_e164?: string
          x_url?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_listings_city_fkey"
            columns: ["city"]
            isOneToOne: false
            referencedRelation: "city_zones"
            referencedColumns: ["city"]
          },
        ]
      }
      provider_profile_views: {
        Row: {
          anon_session_id: string | null
          id: number
          provider_id: string
          provider_type: string
          source: string | null
          viewed_at: string
        }
        Insert: {
          anon_session_id?: string | null
          id?: number
          provider_id: string
          provider_type: string
          source?: string | null
          viewed_at?: string
        }
        Update: {
          anon_session_id?: string | null
          id?: number
          provider_id?: string
          provider_type?: string
          source?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      provinces: {
        Row: {
          centroid_lat: number | null
          centroid_lng: number | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          id: string
          name: string
        }
        Update: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          driver_id: string
          endpoint: string
          id: number
          last_seen_at: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth_key: string
          created_at?: string
          driver_id: string
          endpoint: string
          id?: number
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth_key?: string
          created_at?: string
          driver_id?: string
          endpoint?: string
          id?: number
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      regencies: {
        Row: {
          centroid_lat: number | null
          centroid_lng: number | null
          created_at: string
          id: string
          name: string
          province_id: string
          type: string
        }
        Insert: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          id: string
          name: string
          province_id: string
          type: string
        }
        Update: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          id?: string
          name?: string
          province_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "regencies_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          driver_user_id: string | null
          id: string
          ip_hash: string | null
          provider_id: string | null
          provider_type: string | null
          rating: number
          reviewer_country: string | null
          reviewer_name: string
          reviewer_whatsapp: string | null
          session_id: string | null
          source: string
          status: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          driver_user_id?: string | null
          id?: string
          ip_hash?: string | null
          provider_id?: string | null
          provider_type?: string | null
          rating: number
          reviewer_country?: string | null
          reviewer_name: string
          reviewer_whatsapp?: string | null
          session_id?: string | null
          source?: string
          status?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          driver_user_id?: string | null
          id?: string
          ip_hash?: string | null
          provider_id?: string | null
          provider_type?: string | null
          rating?: number
          reviewer_country?: string | null
          reviewer_name?: string
          reviewer_whatsapp?: string | null
          session_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_driver_user_id_fkey"
            columns: ["driver_user_id"]
            isOneToOne: false
            referencedRelation: "drivers_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      skincare_providers: {
        Row: {
          availability: string
          avatar_frame_style: string | null
          bio: string
          busy_dates: string[] | null
          certifications: string[] | null
          city: string | null
          contact_email: string | null
          contact_form_enabled: boolean
          country_code: string | null
          cover_image_url: string | null
          created_at: string
          cta_button_effect: string | null
          custom_services_offered: string[]
          display_name: string
          facebook_url: string | null
          faq_enabled: boolean
          faq_items: Json
          gallery_image_urls: string[] | null
          gender: string
          has_physical_location: boolean
          hero_text: Json | null
          id: string
          instagram_url: string | null
          is_mock: boolean
          kakaotalk_id: string | null
          languages: string[] | null
          last_active_at: string | null
          latitude: number | null
          legal_privacy: string | null
          legal_terms: string | null
          line_id: string | null
          longitude: number | null
          marketplace_categories: string[]
          midtrans_client_key: string | null
          midtrans_is_production: boolean
          midtrans_server_key_enc: string | null
          mock_hidden_at: string | null
          operating_hours: Json | null
          paid_until: string | null
          payment_provider: string
          price_120min_idr: number | null
          price_60min_idr: number | null
          price_90min_idr: number | null
          profile_image_url: string | null
          promo_text: string | null
          service_area_notes: string | null
          service_locations: string[] | null
          service_photos: Json
          services_offered: string[]
          slug: string
          snapchat_url: string | null
          status: string
          stripe_publishable_key: string | null
          stripe_secret_key_enc: string | null
          subscription_status: string
          telegram_handle: string | null
          theme_color: string | null
          tiktok_url: string | null
          trial_ends_at: string
          updated_at: string
          user_id: string | null
          website_url: string | null
          wechat_id: string | null
          whatsapp_e164: string
          x_url: string | null
          years_experience: number
        }
        Insert: {
          availability?: string
          avatar_frame_style?: string | null
          bio?: string
          busy_dates?: string[] | null
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string
          cta_button_effect?: string | null
          custom_services_offered?: string[]
          display_name: string
          facebook_url?: string | null
          faq_enabled?: boolean
          faq_items?: Json
          gallery_image_urls?: string[] | null
          gender?: string
          has_physical_location?: boolean
          hero_text?: Json | null
          id?: string
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          legal_privacy?: string | null
          legal_terms?: string | null
          line_id?: string | null
          longitude?: number | null
          marketplace_categories?: string[]
          midtrans_client_key?: string | null
          midtrans_is_production?: boolean
          midtrans_server_key_enc?: string | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          payment_provider?: string
          price_120min_idr?: number | null
          price_60min_idr?: number | null
          price_90min_idr?: number | null
          profile_image_url?: string | null
          promo_text?: string | null
          service_area_notes?: string | null
          service_locations?: string[] | null
          service_photos?: Json
          services_offered?: string[]
          slug: string
          snapchat_url?: string | null
          status?: string
          stripe_publishable_key?: string | null
          stripe_secret_key_enc?: string | null
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164: string
          x_url?: string | null
          years_experience?: number
        }
        Update: {
          availability?: string
          avatar_frame_style?: string | null
          bio?: string
          busy_dates?: string[] | null
          certifications?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string
          cta_button_effect?: string | null
          custom_services_offered?: string[]
          display_name?: string
          facebook_url?: string | null
          faq_enabled?: boolean
          faq_items?: Json
          gallery_image_urls?: string[] | null
          gender?: string
          has_physical_location?: boolean
          hero_text?: Json | null
          id?: string
          instagram_url?: string | null
          is_mock?: boolean
          kakaotalk_id?: string | null
          languages?: string[] | null
          last_active_at?: string | null
          latitude?: number | null
          legal_privacy?: string | null
          legal_terms?: string | null
          line_id?: string | null
          longitude?: number | null
          marketplace_categories?: string[]
          midtrans_client_key?: string | null
          midtrans_is_production?: boolean
          midtrans_server_key_enc?: string | null
          mock_hidden_at?: string | null
          operating_hours?: Json | null
          paid_until?: string | null
          payment_provider?: string
          price_120min_idr?: number | null
          price_60min_idr?: number | null
          price_90min_idr?: number | null
          profile_image_url?: string | null
          promo_text?: string | null
          service_area_notes?: string | null
          service_locations?: string[] | null
          service_photos?: Json
          services_offered?: string[]
          slug?: string
          snapchat_url?: string | null
          status?: string
          stripe_publishable_key?: string | null
          stripe_secret_key_enc?: string | null
          subscription_status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164?: string
          x_url?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      social_share_quota: {
        Row: {
          count: number
          created_at: string
          driver_user_id: string
          id: number
          last_banner_id: string | null
          last_platform: string | null
          last_shared_at: string | null
          month_yyyy_mm: string
        }
        Insert: {
          count?: number
          created_at?: string
          driver_user_id: string
          id?: number
          last_banner_id?: string | null
          last_platform?: string | null
          last_shared_at?: string | null
          month_yyyy_mm: string
        }
        Update: {
          count?: number
          created_at?: string
          driver_user_id?: string
          id?: number
          last_banner_id?: string | null
          last_platform?: string | null
          last_shared_at?: string | null
          month_yyyy_mm?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          admin_notes: string | null
          amount_idr: number
          id: string
          period_end: string
          period_start: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          vehicle_type: string
        }
        Insert: {
          admin_notes?: string | null
          amount_idr?: number
          id?: string
          period_end: string
          period_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          vehicle_type: string
        }
        Update: {
          admin_notes?: string | null
          amount_idr?: number
          id?: string
          period_end?: string
          period_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_idr: number
          current_period_end: string | null
          driver_id: string
          notes: string | null
          payment_reference: string | null
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          amount_idr?: number
          current_period_end?: string | null
          driver_id: string
          notes?: string | null
          payment_reference?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_idr?: number
          current_period_end?: string | null
          driver_id?: string
          notes?: string | null
          payment_reference?: string | null
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tour_bookings: {
        Row: {
          created_at: string
          customer_name: string
          customer_whatsapp: string
          id: string
          notes: string | null
          requested_date: string
          requested_time: string
          service_name: string | null
          status: string
          submitter_ip_hash: string | null
          tour_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          id?: string
          notes?: string | null
          requested_date: string
          requested_time: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          tour_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          id?: string
          notes?: string | null
          requested_date?: string
          requested_time?: string
          service_name?: string | null
          status?: string
          submitter_ip_hash?: string | null
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_bookings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tour_guide_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_guide_listings: {
        Row: {
          address: string | null
          availability: string
          available_now: boolean
          bike_brand: string
          busy_dates: string[] | null
          busy_time_slots: Json
          certifications: string[] | null
          city: string
          contact_email: string | null
          contact_form_enabled: boolean
          country_code: string
          cover_image_url: string | null
          created_at: string
          custom_services_offered: string[] | null
          day_rate_idr: number | null
          email: string | null
          facebook_url: string | null
          fuel_included: boolean
          gallery_image_urls: string[] | null
          has_physical_location: boolean | null
          id: string
          image_urls: string[]
          inquiry_count: number
          instagram_url: string | null
          kakaotalk_id: string | null
          languages: string[]
          last_active_at: string | null
          lat: number | null
          line_id: string | null
          lng: number | null
          location: unknown
          name: string
          notes: string | null
          operating_hours: Json | null
          owner_user_id: string
          paid_until: string | null
          promo_text: string | null
          rating: number | null
          rejection_note: string | null
          review_count: number
          services: string[]
          slug: string
          snapchat_url: string | null
          status: string
          telegram_handle: string | null
          theme_color: string | null
          tiktok_url: string | null
          updated_at: string
          verified: boolean
          visitor_count: number
          website_url: string | null
          wechat_id: string | null
          whatsapp_e164: string
          x_url: string | null
        }
        Insert: {
          address?: string | null
          availability?: string
          available_now?: boolean
          bike_brand?: string
          busy_dates?: string[] | null
          busy_time_slots?: Json
          certifications?: string[] | null
          city: string
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          day_rate_idr?: number | null
          email?: string | null
          facebook_url?: string | null
          fuel_included?: boolean
          gallery_image_urls?: string[] | null
          has_physical_location?: boolean | null
          id?: string
          image_urls?: string[]
          inquiry_count?: number
          instagram_url?: string | null
          kakaotalk_id?: string | null
          languages?: string[]
          last_active_at?: string | null
          lat?: number | null
          line_id?: string | null
          lng?: number | null
          location?: unknown
          name: string
          notes?: string | null
          operating_hours?: Json | null
          owner_user_id: string
          paid_until?: string | null
          promo_text?: string | null
          rating?: number | null
          rejection_note?: string | null
          review_count?: number
          services?: string[]
          slug: string
          snapchat_url?: string | null
          status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          updated_at?: string
          verified?: boolean
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164: string
          x_url?: string | null
        }
        Update: {
          address?: string | null
          availability?: string
          available_now?: boolean
          bike_brand?: string
          busy_dates?: string[] | null
          busy_time_slots?: Json
          certifications?: string[] | null
          city?: string
          contact_email?: string | null
          contact_form_enabled?: boolean
          country_code?: string
          cover_image_url?: string | null
          created_at?: string
          custom_services_offered?: string[] | null
          day_rate_idr?: number | null
          email?: string | null
          facebook_url?: string | null
          fuel_included?: boolean
          gallery_image_urls?: string[] | null
          has_physical_location?: boolean | null
          id?: string
          image_urls?: string[]
          inquiry_count?: number
          instagram_url?: string | null
          kakaotalk_id?: string | null
          languages?: string[]
          last_active_at?: string | null
          lat?: number | null
          line_id?: string | null
          lng?: number | null
          location?: unknown
          name?: string
          notes?: string | null
          operating_hours?: Json | null
          owner_user_id?: string
          paid_until?: string | null
          promo_text?: string | null
          rating?: number | null
          rejection_note?: string | null
          review_count?: number
          services?: string[]
          slug?: string
          snapchat_url?: string | null
          status?: string
          telegram_handle?: string | null
          theme_color?: string | null
          tiktok_url?: string | null
          updated_at?: string
          verified?: boolean
          visitor_count?: number
          website_url?: string | null
          wechat_id?: string | null
          whatsapp_e164?: string
          x_url?: string | null
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          account_type: string
          created_at: string
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_started_at: string | null
          subscription_status: string
          tour_guide_expires_at: string | null
          tour_guide_plan: string | null
          tour_guide_started_at: string | null
          tour_guide_status: string
          trusted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          tour_guide_expires_at?: string | null
          tour_guide_plan?: string | null
          tour_guide_started_at?: string | null
          tour_guide_status?: string
          trusted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          tour_guide_expires_at?: string | null
          tour_guide_plan?: string | null
          tour_guide_started_at?: string | null
          tour_guide_status?: string
          trusted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_orders: {
        Row: {
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          fulfillment_status: string
          id: string
          line_items: Json
          notes: string | null
          paid_at: string | null
          payment_provider: string | null
          payment_ref: string | null
          payment_status: string
          scheduled_at: string | null
          service_fee_idr: number
          subtotal_idr: number
          total_idr: number
          updated_at: string
          vendor_id: string
          vendor_type: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          fulfillment_status?: string
          id?: string
          line_items: Json
          notes?: string | null
          paid_at?: string | null
          payment_provider?: string | null
          payment_ref?: string | null
          payment_status?: string
          scheduled_at?: string | null
          service_fee_idr?: number
          subtotal_idr: number
          total_idr: number
          updated_at?: string
          vendor_id: string
          vendor_type: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          fulfillment_status?: string
          id?: string
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          payment_provider?: string | null
          payment_ref?: string | null
          payment_status?: string
          scheduled_at?: string | null
          service_fee_idr?: number
          subtotal_idr?: number
          total_idr?: number
          updated_at?: string
          vendor_id?: string
          vendor_type?: string
        }
        Relationships: []
      }
      villages: {
        Row: {
          centroid_lat: number | null
          centroid_lng: number | null
          created_at: string
          district_id: string
          id: string
          name: string
        }
        Insert: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          district_id: string
          id: string
          name: string
        }
        Update: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          district_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "villages_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_click_events: {
        Row: {
          app_id: string
          city: string | null
          context: string
          country: string | null
          id: number
          ip_hash: string | null
          meta: Json | null
          occurred_at: string
          referrer: string | null
          target_phone_hash: string | null
          user_id: string | null
        }
        Insert: {
          app_id: string
          city?: string | null
          context: string
          country?: string | null
          id?: number
          ip_hash?: string | null
          meta?: Json | null
          occurred_at?: string
          referrer?: string | null
          target_phone_hash?: string | null
          user_id?: string | null
        }
        Update: {
          app_id?: string
          city?: string | null
          context?: string
          country?: string | null
          id?: number
          ip_hash?: string | null
          meta?: Json | null
          occurred_at?: string
          referrer?: string | null
          target_phone_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      affiliate_agents_public: {
        Row: {
          agent_code: string | null
          country: string | null
          created_at: string | null
          id: string | null
          name: string | null
          status: string | null
          total_clicks: number | null
        }
        Insert: {
          agent_code?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          status?: string | null
          total_clicks?: number | null
        }
        Update: {
          agent_code?: string | null
          country?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          status?: string | null
          total_clicks?: number | null
        }
        Relationships: []
      }
      drivers_public: {
        Row: {
          accepts_cash: boolean | null
          accepts_qr: boolean | null
          accepts_transfer: boolean | null
          area: string | null
          availability: string | null
          b2b_score: number | null
          b2b_score_updated_at: string | null
          b2b_tier: string | null
          bike_cc: number | null
          bike_color: string | null
          bike_make: string | null
          bike_model: string | null
          bike_photo_url: string | null
          bike_plate: string | null
          bike_type: string | null
          bike_year: number | null
          bio: string | null
          booking_alerts_consented_at: string | null
          booking_alerts_enabled: boolean | null
          brand_logo_url: string | null
          business_contract_enabled: boolean | null
          business_enabled_at: string | null
          business_max_parcels_per_day: number | null
          business_name: string | null
          business_notes: string | null
          business_services: string[] | null
          city: string | null
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          current_location_updated_at: string | null
          has_box: boolean | null
          last_active_at: string | null
          min_fee: number | null
          online_until: string | null
          paid_until: string | null
          partner_program_status: string | null
          partner_suspended_at: string | null
          partner_suspended_reason: string | null
          pitstop_fee: number | null
          price_per_km: number | null
          rating: number | null
          referral_code: string | null
          referrer_driver_id: string | null
          service_zone_center_lat: number | null
          service_zone_center_lng: number | null
          service_zone_radius_km: number | null
          services: string[] | null
          session_started_at: string | null
          slug: string | null
          status: string | null
          tour_guide_day_rate_idr: number | null
          tour_guide_enabled: boolean | null
          tour_guide_enabled_at: string | null
          tour_guide_languages: string[] | null
          tour_guide_notes: string | null
          trips_count: number | null
          updated_at: string | null
          user_id: string | null
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_photos: Json | null
          vehicle_plate: string | null
          vehicle_seats: number | null
          vehicle_type: string | null
          vehicle_year: number | null
          whatsapp_e164: string | null
        }
        Insert: {
          accepts_cash?: boolean | null
          accepts_qr?: boolean | null
          accepts_transfer?: boolean | null
          area?: string | null
          availability?: string | null
          b2b_score?: number | null
          b2b_score_updated_at?: string | null
          b2b_tier?: string | null
          bike_cc?: number | null
          bike_color?: string | null
          bike_make?: string | null
          bike_model?: string | null
          bike_photo_url?: string | null
          bike_plate?: string | null
          bike_type?: string | null
          bike_year?: number | null
          bio?: string | null
          booking_alerts_consented_at?: string | null
          booking_alerts_enabled?: boolean | null
          brand_logo_url?: string | null
          business_contract_enabled?: boolean | null
          business_enabled_at?: string | null
          business_max_parcels_per_day?: number | null
          business_name?: string | null
          business_notes?: string | null
          business_services?: string[] | null
          city?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          current_location_updated_at?: string | null
          has_box?: boolean | null
          last_active_at?: string | null
          min_fee?: number | null
          online_until?: string | null
          paid_until?: string | null
          partner_program_status?: string | null
          partner_suspended_at?: string | null
          partner_suspended_reason?: string | null
          pitstop_fee?: number | null
          price_per_km?: number | null
          rating?: number | null
          referral_code?: string | null
          referrer_driver_id?: string | null
          service_zone_center_lat?: number | null
          service_zone_center_lng?: number | null
          service_zone_radius_km?: number | null
          services?: string[] | null
          session_started_at?: string | null
          slug?: string | null
          status?: string | null
          tour_guide_day_rate_idr?: number | null
          tour_guide_enabled?: boolean | null
          tour_guide_enabled_at?: string | null
          tour_guide_languages?: string[] | null
          tour_guide_notes?: string | null
          trips_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photos?: Json | null
          vehicle_plate?: string | null
          vehicle_seats?: number | null
          vehicle_type?: string | null
          vehicle_year?: number | null
          whatsapp_e164?: string | null
        }
        Update: {
          accepts_cash?: boolean | null
          accepts_qr?: boolean | null
          accepts_transfer?: boolean | null
          area?: string | null
          availability?: string | null
          b2b_score?: number | null
          b2b_score_updated_at?: string | null
          b2b_tier?: string | null
          bike_cc?: number | null
          bike_color?: string | null
          bike_make?: string | null
          bike_model?: string | null
          bike_photo_url?: string | null
          bike_plate?: string | null
          bike_type?: string | null
          bike_year?: number | null
          bio?: string | null
          booking_alerts_consented_at?: string | null
          booking_alerts_enabled?: boolean | null
          brand_logo_url?: string | null
          business_contract_enabled?: boolean | null
          business_enabled_at?: string | null
          business_max_parcels_per_day?: number | null
          business_name?: string | null
          business_notes?: string | null
          business_services?: string[] | null
          city?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          current_location_updated_at?: string | null
          has_box?: boolean | null
          last_active_at?: string | null
          min_fee?: number | null
          online_until?: string | null
          paid_until?: string | null
          partner_program_status?: string | null
          partner_suspended_at?: string | null
          partner_suspended_reason?: string | null
          pitstop_fee?: number | null
          price_per_km?: number | null
          rating?: number | null
          referral_code?: string | null
          referrer_driver_id?: string | null
          service_zone_center_lat?: number | null
          service_zone_center_lng?: number | null
          service_zone_radius_km?: number | null
          services?: string[] | null
          session_started_at?: string | null
          slug?: string | null
          status?: string | null
          tour_guide_day_rate_idr?: number | null
          tour_guide_enabled?: boolean | null
          tour_guide_enabled_at?: string | null
          tour_guide_languages?: string[] | null
          tour_guide_notes?: string | null
          trips_count?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photos?: Json | null
          vehicle_plate?: string | null
          vehicle_seats?: number | null
          vehicle_type?: string | null
          vehicle_year?: number | null
          whatsapp_e164?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_referrer_driver_id_fkey"
            columns: ["referrer_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _beautician_service_photos_ok: { Args: { p: Json }; Returns: boolean }
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _recompute_provider_rating: {
        Args: { p_provider_id: string; p_provider_type: string }
        Returns: undefined
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      is_driver: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      revert_receipt_activation: {
        Args: { p_receipt_id: string }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      suspend_delinquent_partner_drivers: { Args: never; Returns: number }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
