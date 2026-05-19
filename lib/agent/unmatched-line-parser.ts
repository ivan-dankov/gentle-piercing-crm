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

/** Heuristic recovery for lines the model put in unmatched_lines */
export function parseUnmatchedLine(line: string): ParsedLineItems | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const products: LineProduct[] = []
  const services: LineService[] = []
  let rest = trimmed

  // PRICE (SKU) — e.g. 160 (32), 170 (к1226), 150 (187с)
  for (const m of rest.matchAll(/(\d+)\s*\(\s*([^)]+)\s*\)/g)) {
    products.push({
      price: Number(m[1]),
      sku_hint: m[2].trim(),
      qty: 1,
    })
  }
  rest = rest.replace(/(\d+)\s*\(\s*[^)]+\s*\)/g, ' ')

  // PRICE + SKU without parens — e.g. 170 к1229, 150 896-10
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

  // PRICE * QTY — e.g. 70*4 (price-only product line)
  for (const m of rest.matchAll(/(\d+)\s*\*\s*(\d+)/g)) {
    products.push({
      price: Number(m[1]),
      qty: Number(m[2]),
    })
  }
  rest = rest.replace(/(\d+)\s*\*\s*(\d+)/g, ' ')

  // PRICE + name — e.g. 60 бижутерия Сваровски, 15 лосьон
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

  // Remaining standalone numbers → services (typical 90/150/170)
  for (const m of rest.matchAll(/\b(\d{2,4})\b/g)) {
    const price = Number(m[1])
    if (price >= 10 && price <= 999) {
      services.push({ price })
    }
  }

  if (products.length === 0 && services.length === 0) return null
  return { services, products }
}
