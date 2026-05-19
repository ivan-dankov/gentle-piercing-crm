export interface CatalogProduct {
  id: string
  name: string
  sku: string | null
  sale_price: number
  cost: number | null
}

import {
  productNameSearchTerms,
  productNamesMatch,
} from '@/lib/agent/product-name-match'
import { normalizeServiceLabel, serviceNameScore } from '@/lib/agent/service-utils'

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
  '24с1': '24C1',
  unicorn: 'K010C',
  k1229: 'K1229C',
  'к1229': 'K1229C',
  'К1229': 'K1229C',
  'к1226': 'K1226C',
  'к1226с': 'K1226C',
  'к1232': 'K1232C',
  'к1223с': 'K1223C',
  '117с': '117C',
  '578с': '578C',
  '587с': '587C',
  '85с': '85C',
  '32с': '32C',
  '848s-2': '848S-2',
  '176с': '176C',
  '174с': '174C',
}

/** Cyrillic letters that often stand in for Latin in operator SKUs */
function latinizeSkuChars(s: string): string {
  return s
    .replace(/^[кК]/, 'K')
    .replace(/^[сС](?=\d)/, 'C')
    .replace(/с(\d*)$/i, 'C$1')
    .replace(/С(\d*)$/, 'C$1')
}

export function normalizeSkuHint(hint: string): string {
  const trimmed = hint.trim()
  const lower = trimmed.toLowerCase()
  if (SKU_ALIASES[lower]) return SKU_ALIASES[lower]
  if (SKU_ALIASES[trimmed]) return SKU_ALIASES[trimmed]

  const latinized = latinizeSkuChars(trimmed)
  const latinLower = latinized.toLowerCase()
  if (SKU_ALIASES[latinLower]) return SKU_ALIASES[latinLower]

  // K-prefix catalog SKUs: к1229 → K1229C when catalog uses trailing C
  if (/^k\d{3,4}$/i.test(latinized)) {
    return `${latinized.toUpperCase()}C`
  }

  // Common pattern: trailing cyrillic с → C suffix (32с, 587с)
  if (/[сС]\d*$/i.test(latinized) && !/[cC]\d*$/.test(latinized)) {
    const base = latinized.replace(/[сС]\d*$/i, '')
    const suffix = latinized.match(/[сС](\d*)$/i)?.[1] ?? ''
    return `${base}C${suffix}`
  }

  return latinized
}

function skuCandidates(hint: string): string[] {
  const trimmed = hint.trim()
  const n = normalizeSkuHint(trimmed)
  const lower = n.toLowerCase()
  const out = new Set([
    trimmed,
    n,
    lower,
    n.toUpperCase(),
    latinizeSkuChars(trimmed),
    latinizeSkuChars(trimmed).toUpperCase(),
  ])
  if (/^k\d{3,4}c?$/i.test(n)) {
    out.add(n.toUpperCase())
    out.add(n.toUpperCase().replace(/C$/, '') + 'C')
  }
  return [...out]
}

/** Catalog singles are named "Single - …"; pairs use the same SKU without that prefix */
export function isSingleProductName(name: string): boolean {
  return /^single\s*-/i.test(name.trim())
}

/** Same SKU often maps to a pair and a single — use operator price to pick variant */
export function pickAmongSkuVariants(
  candidates: CatalogProduct[],
  operatorPrice: number
): CatalogProduct {
  if (candidates.length === 1) return candidates[0]

  const closest = (list: CatalogProduct[]) =>
    [...list].sort(
      (a, b) =>
        Math.abs(a.sale_price - operatorPrice) -
        Math.abs(b.sale_price - operatorPrice)
    )[0]

  const singles = candidates.filter((p) => isSingleProductName(p.name))
  const pairs = candidates.filter((p) => !isSingleProductName(p.name))

  if (singles.length === 0) return closest(candidates)
  if (pairs.length === 0) return closest(candidates)

  const single = closest(singles)
  const pair = closest(pairs)
  const dSingle = Math.abs(single.sale_price - operatorPrice)
  const dPair = Math.abs(pair.sale_price - operatorPrice)

  if (dSingle + 20 < dPair) return single
  if (dPair + 20 < dSingle) return pair

  if (operatorPrice <= pair.sale_price * 0.75) return single
  if (operatorPrice >= pair.sale_price * 0.9) return pair

  return dSingle <= dPair ? single : pair
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

  if (sku_hint) {
    const variants = skuCandidates(sku_hint)
    const bySku = products.filter((p) => {
      if (!p.sku) return false
      const catalogVariants = skuCandidates(p.sku)
      return variants.some((v) =>
        catalogVariants.some(
          (cv) =>
            cv.toLowerCase() === v.toLowerCase() ||
            normalizeSkuHint(cv).toLowerCase() === normalizeSkuHint(v).toLowerCase()
        )
      )
    })
    if (bySku.length > 0) {
      const best = pickAmongSkuVariants(bySku, price)
      return {
        product_id: best.id,
        resolved_name: best.name,
        resolved_sku: best.sku,
        match_confidence: 'high',
      }
    }
  }

  if (name_hint) {
    const q = name_hint.toLowerCase().trim()
    const nameTerms = productNameSearchTerms(q)
    const byName = products.filter((p) => {
      const n = p.name.toLowerCase()
      return (
        productNamesMatch(q, p.name) ||
        nameTerms.some((t) => n.includes(t)) ||
        n.includes(q) ||
        q.includes(n)
      )
    })
    if (byName.length > 0) {
      const sorted = [...byName].sort((a, b) => {
        const scoreA =
          (a.name.toLowerCase().includes(q) ? 2 : 0) -
          Math.abs(a.sale_price - price) / 100
        const scoreB =
          (b.name.toLowerCase().includes(q) ? 2 : 0) -
          Math.abs(b.sale_price - price) / 100
        return scoreB - scoreA
      })
      const best = sorted[0]
      return {
        product_id: best.id,
        resolved_name: best.name,
        resolved_sku: best.sku,
        match_confidence: 'high',
      }
    }
  }

  return { match_confidence: 'none' }
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
    const q = normalizeServiceLabel(label)
    const byName = services.filter((s) => {
      const n = s.name.toLowerCase()
      return n.includes(q) || q.includes(n) || serviceNameScore(label, s.name) >= 0.35
    })
    if (byName.length > 0) candidates = byName

    const scored = services
      .map((s) => ({ s, score: serviceNameScore(label, s.name) }))
      .filter((x) => x.score >= 0.35)
      .sort((a, b) => b.score - a.score)
    if (scored.length > 0) {
      const priceOk = scored.find(
        (x) => Math.abs(x.s.base_price - price) <= 15
      )
      if (priceOk) {
        return {
          service_id: priceOk.s.id,
          resolved_name: priceOk.s.name,
          match_confidence:
            Math.abs(priceOk.s.base_price - price) < 0.01 ? 'high' : 'low',
        }
      }
      // Name match with operator price override (e.g. 110 даунсайз when catalog is 30)
      return {
        service_id: scored[0].s.id,
        resolved_name: scored[0].s.name,
        match_confidence: 'low',
      }
    }
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

  // Without a label, only exact service prices count — avoids 160→150 "Детский мочки"
  if (!label) {
    return { match_confidence: 'none' }
  }

  const closest = [...candidates].sort(
    (a, b) => Math.abs(a.base_price - price) - Math.abs(b.base_price - price)
  )[0]

  if (closest && Math.abs(closest.base_price - price) <= 10) {
    return {
      service_id: closest.id,
      resolved_name: closest.name,
      match_confidence: 'low',
    }
  }

  return { match_confidence: 'none' }
}

/** When price matches a product line but was parsed as a service */
export function matchProductByPrice(
  products: CatalogProduct[],
  services: CatalogService[],
  price: number
): ReturnType<typeof matchProduct> | null {
  const exactService = services.some(
    (s) => Math.abs(s.base_price - price) < 0.01
  )
  if (exactService) return null

  const atPrice = products.filter((p) => Math.abs(p.sale_price - price) < 0.01)
  if (atPrice.length === 0) return null
  if (atPrice.length === 1) {
    const p = atPrice[0]
    return {
      product_id: p.id,
      resolved_name: p.name,
      resolved_sku: p.sku,
      match_confidence: 'low',
    }
  }
  return null
}
