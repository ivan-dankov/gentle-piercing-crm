import { getTodayInTimezone } from '@/lib/date-utils'

export const OPERATOR_REFERENCE_TRANSCRIPT = `
150
15 лосьон
160 (32)

18.05

90
85 (32)
15 лосьон

90
90 (112)

Замена сережек 30
70 бижутерия

160 (40)
150

150
190 (191с)

100 зл сережка в нос и колечко с заменой
`.trim()

export function buildSystemPrompt(catalog: {
  services: { id: string; name: string; base_price: number }[]
  products: { id: string; name: string; sku: string | null; sale_price: number }[]
  timezone: string
}): string {
  const servicesList = catalog.services
    .map((s) => `- ${s.name}: base_price=${s.base_price} PLN (id=${s.id})`)
    .join('\n')

  const productsList = catalog.products
    .map(
      (p) =>
        `- ${p.name}${p.sku ? ` [SKU: ${p.sku}]` : ''}: sale_price=${p.sale_price} PLN (id=${p.id})`
    )
    .join('\n')

  const today = getTodayInTimezone(catalog.timezone)

  return `You parse shorthand Russian/Polish sale messages for a piercing studio CRM.

Timezone: ${catalog.timezone}
Today (for dating): ${today}

RULES:
- Output JSON matching the schema only.
- One message may contain MULTIPLE bookings separated by blank lines or date headers.
- Do NOT invent product_id or service_id. Use sku_hint and name_hint for products; use price and optional label for services.
- Lone numbers matching a SERVICE base_price (e.g. 150, 90, 60, 30) go in services[].
- Numbers 120–200 with a SKU/code (parentheses or after the price) are ALWAYS products[], NEVER services[].
- Never put jewelry SKUs (32, 120, к1229, 191с, 896-3) in services — only in products with sku_hint.
- "PRICE (SKU)" lines are PRODUCTS: price before parentheses, SKU inside (may use Cyrillic: 191с, 25с1, к1229, 187с).
- "PRICE SKU" without parentheses is also a product (e.g. "170 к1229" → price 170, sku_hint "к1229").
- Cyrillic к at the start of a SKU is the same as Latin K (к1226 = K1226C in catalog).
- A line with multiple prices (e.g. "150 120 (10)") is one booking with service 150 + product 120 (10) — never dump parseable lines into unmatched_lines.
- "PRICE name" lines are products by name (e.g. "15 лосьон", "70 бижутерия").
- "DD.MM" lines only separate booking groups (do not use for calendar date; the app uses message send time).
- total_paid per booking = sum of service prices + product line prices unless explicitly stated otherwise.
- Every service and product object MUST include a numeric "price" field (required).
- booksy_fee_enabled if message mentions booksy/букси.
- payment_method: blik if "блик/blik", card if "карта/card", else cash.
- Put unparseable lines in unmatched_lines.

REFERENCE EXAMPLES (illustrative only — messages vary):
${OPERATOR_REFERENCE_TRANSCRIPT}

SERVICES CATALOG:
${servicesList || '(empty)'}

PRODUCTS CATALOG:
${productsList || '(empty)'}`
}
