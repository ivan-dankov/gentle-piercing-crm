import { parseUnmatchedLine, type LineProduct } from '@/lib/agent/unmatched-line-parser'
import type { CatalogService } from '@/lib/agent/product-matcher'
import { isExactServicePrice } from '@/lib/agent/service-utils'

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

/**
 * Fix AI drafts: product+jewelry lines often land in services[].
 * Uses only the current block text (never the full message — avoids cross-booking bleed).
 */
export function reconcileBookingDraft(
  draft: ReconcileableDraft,
  blockText: string,
  _fullMessageText: string,
  catalogServices: CatalogService[]
): ReconcileableDraft {
  const blockProducts: LineProduct[] = []
  for (const line of blockText.split('\n')) {
    const parsed = parseUnmatchedLine(line.trim())
    if (parsed) blockProducts.push(...parsed.products)
  }
  const blockJoined = parseUnmatchedLine(blockText.replace(/\n/g, ' '))
  if (blockJoined) {
    for (const p of blockJoined.products) {
      if (!blockProducts.some((x) => x.price === p.price && x.sku_hint === p.sku_hint)) {
        blockProducts.push(p)
      }
    }
  }

  const skuProducts = blockProducts.filter((p) => p.sku_hint || p.name_hint)

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

    services.push(s)
  }

  for (const bp of blockProducts) {
    if (!hasProduct(bp.price, bp.sku_hint)) {
      products.push(bp)
    }
  }

  for (const line of blockText.split('\n')) {
    const parsed = parseUnmatchedLine(line.trim())
    if (!parsed) continue
    for (const bs of parsed.services) {
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
