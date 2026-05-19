export interface LineProduct {
  price: number
  sku_hint?: string
  name_hint?: string
  qty?: number
}

export interface LineService {
  price: number
  label?: string
}

export interface ParsedLineItems {
  services: LineService[]
  products: LineProduct[]
}

/** Qty shorthand not auto-parsed (e.g. 70*4) — show in UI */
export function isQtyShorthandLine(line: string): boolean {
  return /^\d+\s*\*\s*\d+$/.test(line.trim())
}

export function collectQtyShorthandLines(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (isQtyShorthandLine(t) && !seen.has(t)) {
      seen.add(t)
      out.push(t)
    }
  }
  return out
}

/**
 * Structural recovery only (SKU / price tokens). Catalog matching happens in resolveBooking.
 */
export function parseUnmatchedLine(line: string): ParsedLineItems | null {
  const trimmed = line.trim()
  if (!trimmed || isQtyShorthandLine(trimmed)) return null

  const products: LineProduct[] = []
  const services: LineService[] = []
  let rest = trimmed

  for (const m of rest.matchAll(/(\d+)\s*\(\s*([^)]+)\s*\)/g)) {
    products.push({
      price: Number(m[1]),
      sku_hint: m[2].trim(),
      qty: 1,
    })
  }
  rest = rest.replace(/(\d+)\s*\(\s*[^)]+\s*\)/g, ' ')

  for (const m of rest.matchAll(
    /(\d+)\s+([кКkK][\w\d-]+|\d+[сСcC][\w\d-]*|\d{3,}-\d+)/gi
  )) {
    products.push({
      price: Number(m[1]),
      sku_hint: m[2].trim(),
      qty: 1,
    })
  }
  rest = rest.replace(
    /(\d+)\s+([кКkK][\w\d-]+|\d+[сСcC][\w\d-]*|\d{3,}-\d+)/gi,
    ' '
  )

  if (!/^\d+\s*\*\s*\d+$/.test(trimmed)) {
    for (const m of rest.matchAll(/(\d+)\s*\*\s*(\d+)/g)) {
      products.push({
        price: Number(m[1]),
        qty: Number(m[2]),
      })
    }
    rest = rest.replace(/(\d+)\s*\*\s*(\d+)/g, ' ')
  }

  for (const m of rest.matchAll(
    /(\d+)\s+([а-яА-ЯёЁa-zA-Z][^0-9(]{2,}?)(?=\s+\d+\s|$)/g
  )) {
    const name = m[2].trim()
    if (name.length >= 2) {
      products.push({ price: Number(m[1]), name_hint: name, qty: 1 })
    }
  }
  rest = rest.replace(
    /(\d+)\s+([а-яА-ЯёЁa-zA-Z][^0-9(]{2,}?)(?=\s+\d+\s|$)/g,
    ' '
  )

  for (const m of rest.matchAll(/\b(\d{2,4})\b/g)) {
    const price = Number(m[1])
    if (price >= 10 && price <= 999) {
      services.push({ price })
    }
  }

  if (products.length === 0 && services.length === 0) return null
  return { services, products }
}
