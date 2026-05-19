import { parseUnmatchedLine, type LineProduct } from '@/lib/agent/unmatched-line-parser'
import type { CatalogService } from '@/lib/agent/product-matcher'

export type DraftLine = {
  price: number
  sku_hint?: string
  name_hint?: string
  qty?: number
  label?: string
}

export type ReconcileableDraft = {
  services: DraftLine[]
  products: DraftLine[]
  total_paid?: number
  payment_method?: 'cash' | 'blik' | 'card'
  booksy_fee_enabled?: boolean
  notes?: string
  booking_date?: string
}

/** Split operator message into booking blocks (blank line or DD.MM header) */
export function splitBookingBlocks(text: string): string[] {
  const blocks: string[] = []
  let current: string[] = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (/^\d{1,2}\.\d{1,2}(?:\.\d{2,4})?$/.test(trimmed)) {
      if (current.length > 0) {
        blocks.push(current.join('\n'))
        current = []
      }
      continue
    }
    if (trimmed === '') {
      if (current.length > 0) {
        blocks.push(current.join('\n'))
        current = []
      }
      continue
    }
    current.push(line)
  }
  if (current.length > 0) blocks.push(current.join('\n'))

  return blocks.filter((b) => b.trim().length > 0)
}

function productKey(p: LineProduct): string {
  return `${p.price}:${p.sku_hint ?? ''}:${p.name_hint ?? ''}`
}

/** Pull product lines (with SKU) from every non-empty line in the message */
export function extractProductsFromText(text: string): LineProduct[] {
  const seen = new Set<string>()
  const out: LineProduct[] = []

  for (const line of text.split('\n')) {
    const parsed = parseUnmatchedLine(line)
    if (!parsed) continue
    for (const p of parsed.products) {
      const key = productKey(p)
      if (!seen.has(key)) {
        seen.add(key)
        out.push(p)
      }
    }
  }

  const blockParsed = parseUnmatchedLine(text.replace(/\n/g, ' '))
  if (blockParsed) {
    for (const p of blockParsed.products) {
      const key = productKey(p)
      if (!seen.has(key)) {
        seen.add(key)
        out.push(p)
      }
    }
  }

  return out
}

function looksLikeSku(text: string): boolean {
  const t = text.trim()
  return (
    /^[кКkK][\w\d-]+$/i.test(t) ||
    /^\d+[сСcC][\w\d-]*$/i.test(t) ||
    /^\d{2,4}-\d+$/.test(t) ||
    /^\(\s*[^)]+\s*\)$/.test(t)
  )
}

function isExactServicePrice(price: number, services: CatalogService[]): boolean {
  return services.some((s) => Math.abs(s.base_price - price) < 0.01)
}

/**
 * Fix AI drafts: product+jewelry lines often land in services[].
 * Uses block text + global SKU patterns from the full message.
 */
export function reconcileBookingDraft(
  draft: ReconcileableDraft,
  blockText: string,
  fullMessageText: string,
  catalogServices: CatalogService[]
): ReconcileableDraft {
  const fromBlock = parseUnmatchedLine(blockText.replace(/\n/g, ' '))
  const blockProducts = fromBlock?.products ?? []
  const globalProducts = extractProductsFromText(fullMessageText)

  const skuProducts = [...blockProducts, ...globalProducts].filter(
    (p) => p.sku_hint || p.name_hint
  )

  const services: DraftLine[] = []
  const products: DraftLine[] = [...draft.products]

  const hasProduct = (price: number, sku?: string) =>
    products.some(
      (p) =>
        p.price === price &&
        (sku ? p.sku_hint === sku : true)
    )

  for (const s of draft.services) {
    const labelSku =
      s.label && looksLikeSku(s.label) ? s.label.replace(/[()]/g, '').trim() : undefined

    const skuMatch = skuProducts.find(
      (p) =>
        p.price === s.price &&
        (p.sku_hint || p.name_hint) &&
        !hasProduct(p.price, p.sku_hint)
    )

    if (skuMatch) {
      products.push({
        price: skuMatch.price,
        sku_hint: skuMatch.sku_hint,
        name_hint: skuMatch.name_hint,
        qty: skuMatch.qty ?? 1,
      })
      continue
    }

    if (labelSku) {
      products.push({
        price: s.price,
        sku_hint: labelSku,
        qty: 1,
      })
      continue
    }

    // Jewelry price band: not an exact service price → treat as product attempt
    const exactService = isExactServicePrice(s.price, catalogServices)
    const inJewelryBand = s.price >= 70 && s.price <= 200 && s.price % 10 === 0

    if (!exactService && inJewelryBand) {
      const byPrice = globalProducts.filter((p) => p.price === s.price && p.sku_hint)
      if (byPrice.length === 1) {
        products.push(byPrice[0])
        continue
      }
    }

    services.push(s)
  }

  for (const bp of blockProducts) {
    if (!hasProduct(bp.price, bp.sku_hint)) {
      products.push(bp)
    }
  }

  if (fromBlock?.services) {
    for (const bs of fromBlock.services) {
      if (
        isExactServicePrice(bs.price, catalogServices) &&
        !services.some((s) => s.price === bs.price)
      ) {
        services.push(bs)
      }
    }
  }

  return { ...draft, services, products }
}

export function dedupeResolvedBookings<T extends { total_paid: number; services: { price: number }[]; products: { price: number; sku_hint?: string }[] }>(
  bookings: T[]
): T[] {
  const seen = new Set<string>()
  const out: T[] = []

  for (const b of bookings) {
    const sig = JSON.stringify({
      total: b.total_paid,
      s: b.services.map((x) => x.price).sort(),
      p: b.products
        .map((x) => `${x.price}:${x.sku_hint ?? ''}`)
        .sort(),
    })
    if (seen.has(sig)) continue
    seen.add(sig)
    out.push(b)
  }

  return out
}
