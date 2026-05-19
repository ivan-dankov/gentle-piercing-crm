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

  return `You parse shorthand Russian/Polish sale messages for a piercing studio CRM.

Timezone: ${catalog.timezone}

RULES:
- Output JSON matching the schema only.
- One message may contain MULTIPLE bookings separated by blank lines or date headers.
- Do NOT invent product_id or service_id. Use sku_hint and name_hint for products; use price and optional label for services.
- Lone numbers (e.g. 150, 90) are usually SERVICE prices — match to catalog base_price when possible.
- "PRICE (SKU)" lines are PRODUCTS: price before parentheses, SKU inside (may use Cyrillic: 191с, 25с1).
- "PRICE name" lines are products by name (e.g. "15 лосьон", "70 бижутерия").
- "DD.MM" alone is booking_date for following group (year = current).
- total_paid per booking = sum of service prices + product line prices unless explicitly stated otherwise.
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
