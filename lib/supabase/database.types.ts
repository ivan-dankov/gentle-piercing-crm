export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          phone: string | null
          source: 'booksy' | 'instagram' | 'referral' | 'walk-in' | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          source?: 'booksy' | 'instagram' | 'referral' | 'walk-in' | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          source?: 'booksy' | 'instagram' | 'referral' | 'walk-in' | null
          notes?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          sku: string | null
          category: string | null
          cost: number | null
          sale_price: number
          sold_qty: number
          broken_qty: number
          active: boolean
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          sku?: string | null
          category?: string | null
          cost?: number | null
          sale_price: number
          sold_qty?: number
          broken_qty?: number
          active?: boolean
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          sku?: string | null
          category?: string | null
          cost?: number | null
          sale_price?: number
          sold_qty?: number
          broken_qty?: number
          active?: boolean
          user_id?: string
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          duration_minutes: number
          base_price: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          duration_minutes: number
          base_price: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          duration_minutes?: number
          base_price?: number
          active?: boolean
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          client_id: string | null
          earring_id: string | null
          service_id: string | null
          earring_qty: number
          earring_cost: number | null
          earring_revenue: number | null
          service_price: number
          is_model: boolean
          travel_fee: number
          booksy_fee: number
          custom_discount: number
          broken_earring_loss: number
          total_paid: number
          payment_method: 'cash' | 'blik' | null
          tax_enabled: boolean
          tax_rate: number
          tax_amount: number
          location: string | null
          notes: string | null
          start_time: string
          end_time: string | null
          profit: number | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          earring_id?: string | null
          service_id?: string | null
          earring_qty?: number
          earring_cost?: number | null
          earring_revenue?: number | null
          service_price?: number
          is_model?: boolean
          travel_fee?: number
          booksy_fee?: number
          custom_discount?: number
          broken_earring_loss?: number
          total_paid: number
          payment_method?: 'cash' | 'blik' | null
          tax_enabled?: boolean
          tax_rate?: number
          tax_amount?: number
          location?: string | null
          notes?: string | null
          start_time: string
          end_time?: string | null
          profit?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          earring_id?: string | null
          service_id?: string | null
          earring_qty?: number
          earring_cost?: number | null
          earring_revenue?: number | null
          service_price?: number
          is_model?: boolean
          travel_fee?: number
          booksy_fee?: number
          custom_discount?: number
          broken_earring_loss?: number
          total_paid?: number
          payment_method?: 'cash' | 'blik' | null
          tax_enabled?: boolean
          tax_rate?: number
          tax_amount?: number
          location?: string | null
          notes?: string | null
          start_time?: string
          end_time?: string | null
          profit?: number | null
          created_at?: string
        }
      }
    }
  }
}

