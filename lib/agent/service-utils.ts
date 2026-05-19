import type { CatalogService } from '@/lib/agent/product-matcher'

export function isExactServicePrice(
  price: number,
  services: CatalogService[]
): boolean {
  return services.some((s) => Math.abs(s.base_price - price) < 0.01)
}

/** Normalize Russian operator labels for fuzzy service name match */
export function normalizeServiceLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/зл|zł|pln/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/канала/g, 'канал')
    .replace(/мочки/g, 'мочк')
    .replace(/сереж/g, 'серьг')
    .trim()
}

export function serviceNameScore(
  label: string,
  serviceName: string
): number {
  const a = normalizeServiceLabel(label)
    .split(/\s+/)
    .filter((t) => t.length > 2)
  const b = serviceName
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
  if (a.length === 0 || b.length === 0) return 0

  let hits = 0
  for (const token of a) {
    if (b.some((bt) => bt.includes(token) || token.includes(bt))) hits++
  }
  return hits / Math.max(a.length, b.length)
}

const SERVICE_LABEL_RE =
  /восстановлен|прокол|пирсинг|мочк|уш|нос|бров|губ|замена|дополнительн|канал|выезд/i

export function looksLikeServiceLabel(label?: string): boolean {
  if (!label?.trim()) return false
  return SERVICE_LABEL_RE.test(label)
}
