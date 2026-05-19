import { resolveBookingDateString } from '@/lib/agent/booking-date'

/** Coerce OpenAI JSON numbers (string, null, missing) */
export function coerceNum(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const cleaned = v.trim().replace(/\s/g, '').replace(',', '.')
    const n = parseFloat(cleaned.replace(/[^\d.-]/g, ''))
    if (!Number.isNaN(n)) return n
  }
  return undefined
}

type LooseRecord = Record<string, unknown>

function normalizeService(raw: unknown): LooseRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as LooseRecord
  const price = coerceNum(s.price ?? s.base_price_hint)
  if (price == null) return null
  return { ...s, price }
}

function normalizeProduct(raw: unknown): LooseRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as LooseRecord
  const price = coerceNum(p.price)
  if (price == null) return null
  const qty = coerceNum(p.qty)
  return {
    ...p,
    price,
    qty: qty != null && qty >= 1 ? Math.floor(qty) : 1,
  }
}

function normalizeBooking(raw: unknown, timezone: string): LooseRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as LooseRecord

  const services = (Array.isArray(b.services) ? b.services : [])
    .map(normalizeService)
    .filter((s): s is LooseRecord => s != null)

  const products = (Array.isArray(b.products) ? b.products : [])
    .map(normalizeProduct)
    .filter((p): p is LooseRecord => p != null)

  const total_paid = coerceNum(b.total_paid)

  const booking_date =
    typeof b.booking_date === 'string'
      ? resolveBookingDateString(b.booking_date, timezone) ??
        (b.booking_date as string)
      : undefined

  return {
    ...b,
    services,
    products,
    ...(booking_date ? { booking_date } : {}),
    ...(total_paid != null ? { total_paid } : {}),
  }
}

/** Fix common OpenAI shape issues before Zod validation */
export function normalizeParseJson(json: unknown, timezone: string): unknown {
  if (!json || typeof json !== 'object') return json
  const root = json as LooseRecord

  const bookings = (Array.isArray(root.bookings) ? root.bookings : [])
    .map((b) => normalizeBooking(b, timezone))
    .filter((b): b is LooseRecord => b != null)

  return {
    ...root,
    bookings,
    unmatched_lines: Array.isArray(root.unmatched_lines)
      ? root.unmatched_lines
      : [],
  }
}
