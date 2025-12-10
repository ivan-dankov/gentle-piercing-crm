export type ClientSource = 'booksy' | 'instagram' | 'referral' | 'walk-in';
export type PaymentMethod = 'cash' | 'blik' | 'card';

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  source: ClientSource | null;
  notes: string | null;
  created_at: string;
}

export interface AdditionalCost {
  id: string;
  user_id: string;
  type: string; // Now supports custom categories
  amount: number;
  date: string;
  description: string | null;
  created_at: string;
}

export interface Earring {
  id: string;
  name: string;
  category: string | null;
  cost: number | null;
  sale_price: number;
  sold_qty: number;
  active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  base_price: number;
  active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  client_id: string | null;
  earring_id: string | null;
  service_id: string | null;
  earring_qty: number;
  earring_cost: number | null;
  earring_revenue: number | null;
  service_price: number;
  is_model: boolean;
  travel_fee: number;
  booksy_fee: number;
  custom_discount: number;
  broken_earring_loss: number;
  total_paid: number;
  payment_method: PaymentMethod | null;
  tax_enabled: boolean;
  tax_rate: number;
  tax_amount: number;
  location: string | null;
  notes: string | null;
  start_time: string;
  end_time: string | null;
  profit: number | null;
  created_at: string;
}

export interface BookingEarring {
  id: string;
  booking_id: string;
  earring_id: string;
  qty: number;
  price?: number | null;
  earring?: Earring;
}

export interface BookingService {
  id: string;
  booking_id: string;
  service_id: string;
  price: number;
  service?: Service;
}

export interface BookingBrokenEarring {
  id: string;
  booking_id: string;
  earring_id: string;
  qty: number;
  cost?: number | null;
  earring?: Earring;
}

export interface BookingWithRelations extends Booking {
  client?: Client | null;
  earring?: Earring | null;
  service?: Service | null;
  booking_earrings?: BookingEarring[];
  booking_services?: BookingService[];
  booking_broken_earrings?: BookingBrokenEarring[];
}

