import { z } from 'zod'

export const parsedProductSchema = z.object({
  sku_hint: z.string().optional(),
  name_hint: z.string().optional(),
  qty: z.number().int().min(1).default(1),
  price: z.number(),
})

export const parsedServiceSchema = z.object({
  price: z.number(),
  base_price_hint: z.number().optional(),
  label: z.string().optional(),
})

export const parsedBookingDraftSchema = z.object({
  booking_date: z.string().optional(),
  services: z.array(parsedServiceSchema),
  products: z.array(parsedProductSchema),
  total_paid: z.number().optional(),
  payment_method: z.enum(['cash', 'blik', 'card']).optional(),
  booksy_fee_enabled: z.boolean().optional(),
  notes: z.string().optional(),
})

export const parseSaleResultSchema = z.object({
  bookings: z.array(parsedBookingDraftSchema).min(1),
  unmatched_lines: z.array(z.string()).optional(),
})

export type ParsedProduct = z.infer<typeof parsedProductSchema>
export type ParsedService = z.infer<typeof parsedServiceSchema>
export type ParsedBookingDraft = z.infer<typeof parsedBookingDraftSchema>
export type ParseSaleResult = z.infer<typeof parseSaleResultSchema>

export interface ResolvedProduct extends ParsedProduct {
  product_id?: string
  resolved_name?: string
  resolved_sku?: string | null
  match_confidence?: 'high' | 'low' | 'none'
}

export interface ResolvedService extends ParsedService {
  service_id?: string
  resolved_name?: string
  match_confidence?: 'high' | 'low' | 'none'
}

export interface ResolvedBookingDraft {
  booking_date?: string
  services: ResolvedService[]
  products: ResolvedProduct[]
  total_paid: number
  payment_method: 'cash' | 'blik' | 'card'
  booksy_fee_enabled: boolean
  notes?: string
}

export interface ResolvedParseSaleResult {
  bookings: ResolvedBookingDraft[]
  unmatched_lines: string[]
  raw_message: string
}
