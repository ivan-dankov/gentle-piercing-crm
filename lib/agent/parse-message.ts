import OpenAI from 'openai'
import { buildSystemPrompt } from '@/lib/agent/prompts'
import {
  type CatalogProduct,
  type CatalogService,
  matchProduct,
  matchService,
} from '@/lib/agent/product-matcher'
import {
  type ParseSaleResult,
  type ParsedBookingDraft,
  type ResolvedBookingDraft,
  type ResolvedParseSaleResult,
  parseSaleResultSchema,
} from '@/lib/agent/schemas'

function preprocessMessage(text: string): string {
  return text.trim()
}

function resolveBooking(
  draft: ParsedBookingDraft,
  products: CatalogProduct[],
  services: CatalogService[]
): ResolvedBookingDraft {
  const resolvedServices = draft.services.map((s) => {
    const m = matchService(services, { price: s.price, label: s.label })
    return { ...s, ...m }
  })

  const resolvedProducts = draft.products.map((p) => {
    const m = matchProduct(products, {
      sku_hint: p.sku_hint,
      name_hint: p.name_hint,
      price: p.price,
    })
    return { ...p, ...m }
  })

  const serviceTotal = resolvedServices.reduce((sum, s) => sum + s.price, 0)
  const productTotal = resolvedProducts.reduce(
    (sum, p) => sum + p.price * (p.qty ?? 1),
    0
  )
  const total_paid =
    draft.total_paid ?? serviceTotal + productTotal

  return {
    booking_date: draft.booking_date,
    services: resolvedServices,
    products: resolvedProducts,
    total_paid,
    payment_method: draft.payment_method ?? 'cash',
    booksy_fee_enabled: draft.booksy_fee_enabled ?? false,
    notes: draft.notes,
  }
}

export async function parseSaleMessage(
  message: string,
  catalog: {
    services: CatalogService[]
    products: CatalogProduct[]
    timezone: string
  }
): Promise<ResolvedParseSaleResult> {
  const cleaned = preprocessMessage(message)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const openai = new OpenAI({ apiKey })

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          buildSystemPrompt({
            services: catalog.services.map((s) => ({
              id: s.id,
              name: s.name,
              base_price: s.base_price,
            })),
            products: catalog.products.map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              sale_price: p.sale_price,
            })),
            timezone: catalog.timezone,
          }) +
          '\n\nRespond with JSON only matching: { bookings: [...], unmatched_lines?: string[] }',
      },
      { role: 'user', content: cleaned },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) {
    throw new Error('Empty response from OpenAI')
  }

  const json = JSON.parse(raw) as unknown
  const result = parseSaleResultSchema.safeParse(json)
  if (!result.success) {
    throw new Error(`Invalid parse result: ${result.error.message}`)
  }
  const parsed: ParseSaleResult = result.data

  const bookings = parsed.bookings.map((b) =>
    resolveBooking(b, catalog.products, catalog.services)
  )

  return {
    bookings,
    unmatched_lines: parsed.unmatched_lines ?? [],
    raw_message: cleaned,
  }
}
