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
- Numbers 120–200 with a SKU/code (parentheses or after the price) are ALWAYS products[], NEVER services[]. Line price may differ from catalog (override).
- "PRICE name" for add-ons (даунсайз, лосьон/лосьйон, бижутерия) = products[] with name_hint; use the message price even if catalog base differs.
- "N пары сережек TOTAL зл" = N × unit price (e.g. 3 пары 210 зл → qty 3, product "Бижутерия Али" @ 70 each).
- Never put jewelry SKUs (32, 120, к1229, 191с, 896-3) in services — only in products with sku_hint.
- "PRICE (SKU)" lines are PRODUCTS: price before parentheses, SKU inside (may use Cyrillic: 191с, 25с1, к1229, 187с).
- Same SKU may exist as Pair and Single (name starts with "Single - "); lower line price → Single, ~pair catalog price → Pair.
- "PRICE SKU" without parentheses is also a product (e.g. "170 к1229" → price 170, sku_hint "к1229").
- Cyrillic к at the start of a SKU is the same as Latin K (к1226 = K1226C in catalog).
- A line with multiple prices (e.g. "150 120 (10)") is one booking with service 150 + product 120 (10) — never dump parseable lines into unmatched_lines.
- "PRICE name" lines are products by name (e.g. "15 лосьон", "70 бижутерия") — NOT piercing services.
- "PRICE зл SERVICE DESCRIPTION" is a SERVICE with label (e.g. "50 зл восстановление канала" → service price 50, label "восстановление канала").
- Lone 15 or 20 without SKU = spray/lotion PRODUCT, not a service.
- "PRICE даунсайз" / "PRICE downsize" = PRODUCT with name_hint.
- Lines like "70*4" (qty shorthand) go in unmatched_lines — not auto-parsed yet.
- Each blank-line block = exactly ONE booking; keep all lines of that block together.
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
