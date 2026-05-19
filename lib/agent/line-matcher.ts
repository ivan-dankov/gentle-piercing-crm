import {
  isQtyShorthandLine,
  type LineProduct,
  type LineService,
} from '@/lib/agent/unmatched-line-parser'
import type { CatalogProduct, CatalogService } from '@/lib/agent/product-matcher'
import { isExactServicePrice } from '@/lib/agent/service-utils'

const PRODUCT_NAME_RE =
  /лосьон|спрей|бижутер|сваровск|серьг|сереж|колечк|пара сер|даунсайз|downsize/i

const SERVICE_NAME_RE =
  /восстановлен|прокол|пирсинг|мочк|уш|нос|бров|губ|замена|дополнительн/i

export type AnalyzedLine =
  | { kind: 'product_sku'; price: number; sku_hint: string; qty: number }
  | { kind: 'product_name'; price: number; name_hint: string; qty: number }
  | { kind: 'service_price'; price: number }
  | { kind: 'service_named'; price: number; label: string }
  | { kind: 'qty_shorthand'; raw: string }
  | { kind: 'unparsed'; raw: string }

function looksLikeSkuToken(token: string): boolean {
  const t = token.trim()
  return (
    /^[кКkK][\w\d-]+$/i.test(t) ||
    /^\d+[сСcC][\w\d-]*$/i.test(t) ||
    /^\d{2,4}-\d+$/i.test(t) ||
    /^\d{1,4}$/.test(t)
  )
}

/**
 * Classify one operator line into 0..n billable items.
 * Rule: price + SKU/code → product; operator price always kept (override).
 */
export function analyzeBlockLine(line: string): AnalyzedLine[] {
  const trimmed = line.trim()
  if (!trimmed) return []
  if (isQtyShorthandLine(trimmed)) {
    return [{ kind: 'qty_shorthand', raw: trimmed }]
  }

  const items: AnalyzedLine[] = []
  let rest = trimmed

  // PRICE (SKU)
  for (const m of rest.matchAll(/(\d+)\s*\(\s*([^)]+)\s*\)/g)) {
    items.push({
      kind: 'product_sku',
      price: Number(m[1]),
      sku_hint: m[2].trim(),
      qty: 1,
    })
  }
  rest = rest.replace(/(\d+)\s*\(\s*[^)]+\s*\)/g, ' ').trim()

  // PRICE + SKU token (170 к1229, 150 896-10)
  for (const m of rest.matchAll(
    /(\d+)\s+([кКkK][\w\d-]+|\d+[сСcC][\w\d-]*|\d{3,}-\d+)/gi
  )) {
    items.push({
      kind: 'product_sku',
      price: Number(m[1]),
      sku_hint: m[2].trim(),
      qty: 1,
    })
  }
  rest = rest.replace(
    /(\d+)\s+([кКkK][\w\d-]+|\d+[сСcC][\w\d-]*|\d{3,}-\d+)/gi,
    ' '
  ).trim()

  // Full-line: PRICE [зл] NAME
  const named = trimmed.match(/^(\d+)\s*(?:зл|zł|pln)?\s+(.+)$/i)
  if (named && items.length === 0) {
    const price = Number(named[1])
    const label = named[2].trim()
    if (PRODUCT_NAME_RE.test(label) || (label.split(/\s+/).length <= 2 && !SERVICE_NAME_RE.test(label))) {
      items.push({ kind: 'product_name', price, name_hint: label, qty: 1 })
    } else if (SERVICE_NAME_RE.test(label) || label.split(/\s+/).length > 2) {
      items.push({ kind: 'service_named', price, label })
    } else {
      items.push({ kind: 'product_name', price, name_hint: label, qty: 1 })
    }
    return items
  }

  // PRICE + product name in rest (60 бижутерия …)
  for (const m of rest.matchAll(
    /(\d+)\s+([а-яА-ЯёЁa-zA-Z][^0-9(]{2,}?)(?=\s+\d+\s|$)/g
  )) {
    const name = m[2].trim()
    if (name.length >= 2 && !looksLikeSkuToken(name)) {
      items.push({
        kind: 'product_name',
        price: Number(m[1]),
        name_hint: name,
        qty: 1,
      })
    }
  }
  rest = rest.replace(
    /(\d+)\s+([а-яА-ЯёЁa-zA-Z][^0-9(]{2,}?)(?=\s+\d+\s|$)/g,
    ' '
  ).trim()

  // Lone prices left — piercing service if exact catalog service price
  for (const m of rest.matchAll(/\b(\d{2,4})\b/g)) {
    const price = Number(m[1])
    if (price < 10) continue
    items.push({ kind: 'service_price', price })
  }

  if (items.length === 0) {
    return [{ kind: 'unparsed', raw: trimmed }]
  }

  return items
}

export interface BlockDraft {
  services: LineService[]
  products: LineProduct[]
  unparsed: string[]
  qty_shorthand: string[]
}

export function analyzeBookingBlock(block: string): BlockDraft {
  const services: LineService[] = []
  const products: LineProduct[] = []
  const unparsed: string[] = []
  const qty_shorthand: string[] = []

  for (const line of block.split('\n')) {
    const analyzed = analyzeBlockLine(line)
    for (const item of analyzed) {
      switch (item.kind) {
        case 'product_sku':
          products.push({
            price: item.price,
            sku_hint: item.sku_hint,
            qty: item.qty,
          })
          break
        case 'product_name':
          products.push({
            price: item.price,
            name_hint: item.name_hint,
            qty: item.qty,
          })
          break
        case 'service_price':
          services.push({ price: item.price })
          break
        case 'service_named':
          services.push({ price: item.price, label: item.label })
          break
        case 'qty_shorthand':
          qty_shorthand.push(item.raw)
          break
        case 'unparsed':
          unparsed.push(item.raw)
          break
      }
    }
  }

  return { services, products, unparsed, qty_shorthand }
}

/** Reclassify lone 15/20 as accessories when not exact service prices */
export function refineAccessoryLines(
  draft: BlockDraft,
  catalogServices: CatalogService[],
  catalogProducts: CatalogProduct[]
): BlockDraft {
  const services: LineService[] = []
  const products: LineProduct[] = [...draft.products]

  for (const s of draft.services) {
    if (
      (s.price === 15 || s.price === 20) &&
      !isExactServicePrice(s.price, catalogServices)
    ) {
      const hint = s.price === 20 ? 'спрей' : 'лосьон'
      products.push({ price: s.price, name_hint: hint, qty: 1 })
      continue
    }
    if (
      !s.label &&
      !isExactServicePrice(s.price, catalogServices) &&
      catalogProducts.some((p) => Math.abs(p.sale_price - s.price) < 0.01)
    ) {
      products.push({ price: s.price, qty: 1 })
      continue
    }
    services.push(s)
  }

  return { ...draft, services, products }
}

export function blockDraftFromLines(
  block: string,
  catalogServices: CatalogService[],
  catalogProducts: CatalogProduct[]
): BlockDraft | null {
  const raw = analyzeBookingBlock(block)
  const draft = refineAccessoryLines(raw, catalogServices, catalogProducts)
  if (
    draft.services.length === 0 &&
    draft.products.length === 0
  ) {
    return null
  }
  return draft
}

export function blockLinesAccountedFor(
  block: string,
  draft: BlockDraft
): boolean {
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => Boolean(l) && !isQtyShorthandLine(l))
  if (lines.length === 0) return false
  const itemCount = draft.services.length + draft.products.length
  return itemCount >= lines.length
}
