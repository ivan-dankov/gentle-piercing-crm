export interface CatalogProduct {
  id: string
  name: string
  sku: string | null
  sale_price: number
  cost: number | null
}

export interface CatalogService {
  id: string
  name: string
  base_price: number
  duration_minutes: number
}

const SKU_ALIASES: Record<string, string> = {
  '191с': '191C',
  '191С': '191C',
  '187с': '187C',
  '57с': '57C',
  '1230с': 'K1230C',
  '25с1': '25C1',
  unicorn: 'K010C',
  k1229: 'K1229C',
  'к1223с': 'K1223C',
  '848s-2': '848S-2',
  '176с': '176C',
  '174с': '174C',
}

export function normalizeSkuHint(hint: string): string {
  const trimmed = hint.trim()
  const lower = trimmed.toLowerCase()
  if (SKU_ALIASES[lower]) return SKU_ALIASES[lower]
  if (SKU_ALIASES[trimmed]) return SKU_ALIASES[trimmed]

  // Common pattern: trailing cyrillic с → C suffix
  if (/с\d*$/i.test(trimmed) && !trimmed.endsWith('C')) {
    const base = trimmed.replace(/с\d*$/i, '')
    const suffix = trimmed.match(/с(\d*)$/i)?.[1] ?? ''
    return `${base}C${suffix}`
  }

  return trimmed
}

function skuCandidates(hint: string): string[] {
  const n = normalizeSkuHint(hint)
  const lower = n.toLowerCase()
  return [...new Set([hint.trim(), n, lower, n.toUpperCase()])]
}

export function matchProduct(
  products: CatalogProduct[],
  opts: { sku_hint?: string; name_hint?: string; price: number }
): {
  product_id?: string
  resolved_name?: string
  resolved_sku?: string | null
  match_confidence: 'high' | 'low' | 'none'
} {
  const { sku_hint, name_hint, price } = opts
  let candidates = products

  if (sku_hint) {
    const variants = skuCandidates(sku_hint)
    const bySku = products.filter((p) => {
      if (!p.sku) return false
      const sku = p.sku
      return variants.some(
        (v) =>
          sku.toLowerCase() === v.toLowerCase() ||
          normalizeSkuHint(sku).toLowerCase() === v.toLowerCase()
      )
    })
    if (bySku.length > 0) candidates = bySku
  } else if (name_hint) {
    const q = name_hint.toLowerCase().trim()
    const byName = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase())
    )
    if (byName.length > 0) candidates = byName
  } else {
    return { match_confidence: 'none' }
  }

  if (candidates.length === 0) {
    return { match_confidence: 'none' }
  }

  const sorted = [...candidates].sort(
    (a, b) =>
      Math.abs(a.sale_price - price) - Math.abs(b.sale_price - price)
  )
  const best = sorted[0]
  const confidence =
    sorted.length === 1 ||
    Math.abs(best.sale_price - price) <= Math.abs(sorted[1].sale_price - price) + 5
      ? 'high'
      : 'low'

  return {
    product_id: best.id,
    resolved_name: best.name,
    resolved_sku: best.sku,
    match_confidence: confidence,
  }
}

export function matchService(
  services: CatalogService[],
  opts: { price: number; label?: string }
): {
  service_id?: string
  resolved_name?: string
  match_confidence: 'high' | 'low' | 'none'
} {
  const { price, label } = opts
  let candidates = services

  if (label) {
    const q = label.toLowerCase()
    const byName = services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase())
    )
    if (byName.length > 0) candidates = byName
  }

  const byPrice = candidates.filter((s) => Math.abs(s.base_price - price) < 0.01)
  if (byPrice.length === 1) {
    return {
      service_id: byPrice[0].id,
      resolved_name: byPrice[0].name,
      match_confidence: 'high',
    }
  }

  if (byPrice.length > 1) {
    return {
      service_id: byPrice[0].id,
      resolved_name: byPrice[0].name,
      match_confidence: 'low',
    }
  }

  const closest = [...candidates].sort(
    (a, b) => Math.abs(a.base_price - price) - Math.abs(b.base_price - price)
  )[0]

  if (closest && Math.abs(closest.base_price - price) <= 10) {
    return {
      service_id: closest.id,
      resolved_name: closest.name,
      match_confidence: label ? 'low' : 'high',
    }
  }

  return { match_confidence: 'none' }
}
