import OpenAI from 'openai'
import { buildSystemPrompt } from '@/lib/agent/prompts'
import {
  dedupeResolvedBookings,
  reconcileBookingDraft,
  splitBookingBlocks,
} from '@/lib/agent/reconcile-draft'
import {
  type CatalogProduct,
  type CatalogService,
  matchProduct,
  matchProductByPrice,
  matchService,
} from '@/lib/agent/product-matcher'
import { normalizeParseJson } from '@/lib/agent/normalize-parse'
import { parseUnmatchedLine } from '@/lib/agent/unmatched-line-parser'
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

type BookingDraftInput = {
  services: { price: number; label?: string }[]
  products: {
    price: number
    sku_hint?: string
    name_hint?: string
    qty?: number
  }[]
  total_paid?: number
  payment_method?: ParsedBookingDraft['payment_method']
  booksy_fee_enabled?: boolean
  notes?: string
  booking_date?: string
}

function resolveBooking(
  draft: BookingDraftInput,
  products: CatalogProduct[],
  services: CatalogService[],
  _timezone: string
): ResolvedBookingDraft {
  const resolvedServices: ResolvedBookingDraft['services'] = []
  const resolvedProducts: ResolvedBookingDraft['products'] = []

  for (const p of draft.products) {
    const m = matchProduct(products, {
      sku_hint: p.sku_hint,
      name_hint: p.name_hint,
      price: p.price,
    })
    resolvedProducts.push({
      price: p.price,
      sku_hint: p.sku_hint,
      name_hint: p.name_hint,
      qty: p.qty ?? 1,
      ...m,
    })
  }

  for (const s of draft.services) {
    const m = matchService(services, { price: s.price, label: s.label })
    if (m.service_id) {
      resolvedServices.push({
        price: s.price,
        base_price_hint: undefined,
        label: s.label,
        ...m,
      })
      continue
    }
    const asProduct = matchProduct(products, {
      sku_hint: s.label && /^[кКkK\d]/.test(s.label) ? s.label : undefined,
      name_hint: s.label,
      price: s.price,
    })
    if (asProduct.product_id) {
      resolvedProducts.push({
        price: s.price,
        sku_hint: s.label,
        name_hint: undefined,
        qty: 1,
        ...asProduct,
      })
      continue
    }
    const byPrice = matchProductByPrice(products, services, s.price)
    if (byPrice?.product_id) {
      resolvedProducts.push({
        price: s.price,
        sku_hint: undefined,
        name_hint: undefined,
        qty: 1,
        ...byPrice,
      })
      continue
    }
    resolvedServices.push({
      price: s.price,
      base_price_hint: undefined,
      label: s.label,
      ...m,
    })
  }

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

function recoverUnmatchedLines(
  lines: string[],
  products: CatalogProduct[],
  services: CatalogService[],
  timezone: string
): {
  extraBookings: ResolvedBookingDraft[]
  stillUnmatched: string[]
} {
  const extraBookings: ResolvedBookingDraft[] = []
  const stillUnmatched: string[] = []

  for (const line of lines) {
    const parsed = parseUnmatchedLine(line)
    if (!parsed) {
      stillUnmatched.push(line)
      continue
    }
    const draft = {
      services: parsed.services,
      products: parsed.products,
    }
    const resolved = resolveBooking(draft, products, services, timezone)
    const hasSavable =
      resolved.services.some((s) => s.service_id) ||
      resolved.products.some((p) => p.product_id)
    if (hasSavable) {
      extraBookings.push(resolved)
    } else {
      stillUnmatched.push(line)
    }
  }

  return { extraBookings, stillUnmatched }
}

export async function parseSaleMessage(
  message: string,
  catalog: {
    services: CatalogService[]
    products: CatalogProduct[]
    timezone: string
  },
  messageSentAt: Date
): Promise<ResolvedParseSaleResult> {
  const cleaned = preprocessMessage(message)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const openai = new OpenAI({ apiKey })

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
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

  const json = normalizeParseJson(JSON.parse(raw) as unknown, catalog.timezone)
  const result = parseSaleResultSchema.safeParse(json)
  if (!result.success) {
    throw new Error(`Invalid parse result: ${result.error.message}`)
  }
  if (result.data.bookings.length === 0) {
    throw new Error(
      'Не удалось разобрать продажу: укажите цены (например 150 или 160 (32)).'
    )
  }
  const parsed: ParseSaleResult = result.data
  const blocks = splitBookingBlocks(cleaned)

  const reconciledDrafts = parsed.bookings.map((b, i) => {
    const block =
      blocks.length === parsed.bookings.length
        ? (blocks[i] ?? cleaned)
        : (blocks[i] ?? blocks[0] ?? cleaned)
    return reconcileBookingDraft(
      b,
      block,
      cleaned,
      catalog.services
    )
  })

  let bookings = reconciledDrafts.map((b) =>
    resolveBooking(b, catalog.products, catalog.services, catalog.timezone)
  )

  const unmatched = parsed.unmatched_lines ?? []
  if (unmatched.length > 0) {
    const { extraBookings, stillUnmatched } = recoverUnmatchedLines(
      unmatched,
      catalog.products,
      catalog.services,
      catalog.timezone
    )
    bookings = dedupeResolvedBookings([...bookings, ...extraBookings])
    return {
      bookings,
      unmatched_lines: stillUnmatched,
      raw_message: cleaned,
      message_sent_at: messageSentAt.toISOString(),
    }
  }

  return {
    bookings: dedupeResolvedBookings(bookings),
    unmatched_lines: [],
    raw_message: cleaned,
    message_sent_at: messageSentAt.toISOString(),
  }
}
