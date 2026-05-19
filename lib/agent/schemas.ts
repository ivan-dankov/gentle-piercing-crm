import { z } from 'zod'

/** OpenAI often returns null for omitted optional fields — coerce to undefined */
const optionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null || v === '' ? undefined : v))

const optionalNumber = z
  .union([z.number(), z.null()])
  .optional()
  .transform((v) => (v == null ? undefined : v))

const optionalBoolean = z
  .union([z.boolean(), z.null()])
  .optional()
  .transform((v) => (v == null ? undefined : v))

export const parsedProductSchema = z.object({
  sku_hint: optionalString,
  name_hint: optionalString,
  qty: z
    .union([z.number(), z.null()])
    .optional()
    .transform((v) => (v == null || v < 1 ? 1 : Math.floor(v))),
  price: z.number(),
})

export const parsedServiceSchema = z.object({
  price: z.number(),
  base_price_hint: optionalNumber,
  label: optionalString,
})

export const parsedBookingDraftSchema = z.object({
  booking_date: optionalString,
  services: z.array(parsedServiceSchema).default([]),
  products: z.array(parsedProductSchema).default([]),
  total_paid: optionalNumber,
  payment_method: z
    .union([z.enum(['cash', 'blik', 'card']), z.null()])
    .optional()
    .transform((v) => (v == null ? undefined : v)),
  booksy_fee_enabled: optionalBoolean,
  notes: optionalString,
})

export const parseSaleResultSchema = z.object({
  bookings: z.array(parsedBookingDraftSchema).min(1),
  unmatched_lines: z
    .array(z.union([z.string(), z.null()]))
    .optional()
    .transform((lines) =>
      lines?.filter((l): l is string => l != null && l !== '') ?? []
    ),
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
