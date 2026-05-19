import { getTodayInTimezone } from '@/lib/date-utils'

export const OPERATOR_REFERENCE_TRANSCRIPT = `
150
15 лосьон
160 (32)

18.05

90
85 (32)
15 лосьон

Замена сережек 30
70 бижутерия

160 (40)
150
`.trim()

export function buildSystemPrompt(catalog: {
  services: { id: string; name: string; base_price: number }[]
  products: { id: string; name: string; sku: string | null; sale_price: number }[]
  timezone: string
}): string {
  const servicesList = catalog.services
    .map((s) => `- ${s.name}: ${s.base_price} PLN`)
    .join('\n')

  const productsList = catalog.products
    .map(
      (p) =>
        `- ${p.name}${p.sku ? ` [${p.sku}]` : ''}: ${p.sale_price} PLN`
    )
    .join('\n')

  const today = getTodayInTimezone(catalog.timezone)

  return `Parse shorthand RU/PL sale messages. Use the catalogs below — do not invent ids; output sku_hint / name_hint / service labels only.

Timezone: ${catalog.timezone}. Today: ${today}.

Rules:
- Blank line = new booking. "DD.MM" only splits groups (not the booking date).
- One booking: services[] + products[]; total_paid = sum of line prices.
- Match items to catalog names and SKUs (Cyrillic SKU ok). Line price may differ from catalog (operator override).
- Lone number: service if it matches a service base_price in catalog, else product if it matches a product sale_price, else use nearby words as label/name_hint.
- "PRICE (SKU)" or "PRICE SKU" → product with sku_hint. "PRICE words" / "words PRICE" → product or service by meaning vs catalog.
- Same SKU may exist as Pair vs "Single - …" — pick variant using line price vs catalog sale_price.
- Put only truly unclear lines in unmatched_lines (e.g. "70*4").
- booksy_fee_enabled if booksy/букси. payment_method: blik / card / cash.

Style examples (prices/names vary — always prefer catalog):
${OPERATOR_REFERENCE_TRANSCRIPT}

SERVICES:
${servicesList || '(empty)'}

PRODUCTS:
${productsList || '(empty)'}`
}
