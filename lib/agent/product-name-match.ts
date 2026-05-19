/** Normalize spelling for fuzzy match against catalog names (no fixed product list) */
export function normalizeProductNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/лосьйон/g, 'лосьон')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

export function productNamesMatch(hint: string, catalogName: string): boolean {
  const h = normalizeProductNameKey(hint)
  const c = normalizeProductNameKey(catalogName)
  if (!h || !c) return false
  if (h === c) return true

  const hTokens = h.split(/\s+/).filter((t) => t.length > 2)
  const cTokens = c.split(/\s+/).filter((t) => t.length > 2)
  if (hTokens.length === 0) return c.includes(h) || h.includes(c)

  const hits = hTokens.filter((t) =>
    cTokens.some((ct) => ct.includes(t) || t.includes(ct))
  )
  return hits.length >= Math.min(2, hTokens.length) || c.includes(h) || h.includes(c)
}

export function productNameSearchTerms(hint: string): string[] {
  const q = normalizeProductNameKey(hint)
  return q ? [q] : []
}
