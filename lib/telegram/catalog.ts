import { createAdminClient } from '@/lib/supabase/admin'
import type { CatalogProduct, CatalogService } from '@/lib/agent/product-matcher'

export async function loadCatalog(userId: string): Promise<{
  services: CatalogService[]
  products: CatalogProduct[]
  timezone: string
  productCostMap: Map<string, number | null>
}> {
  const supabase = createAdminClient()

  const [servicesRes, productsRes, profileRes] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, base_price, duration_minutes')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('products')
      .select('id, name, sku, sale_price, cost')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('user_profiles')
      .select('timezone')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (servicesRes.error) throw servicesRes.error
  if (productsRes.error) throw productsRes.error

  type ServiceRow = {
    id: string
    name: string
    base_price: number
    duration_minutes: number
  }
  type ProductRow = {
    id: string
    name: string
    sku: string | null
    sale_price: number
    cost: number | null
  }

  const services: CatalogService[] = (
    (servicesRes.data ?? []) as ServiceRow[]
  ).map((s) => ({
    id: s.id,
    name: s.name,
    base_price: Number(s.base_price),
    duration_minutes: s.duration_minutes,
  }))

  const products: CatalogProduct[] = (
    (productsRes.data ?? []) as ProductRow[]
  ).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    sale_price: Number(p.sale_price),
    cost: p.cost != null ? Number(p.cost) : null,
  }))

  const productCostMap = new Map<string, number | null>()
  for (const p of products) {
    productCostMap.set(p.id, p.cost)
  }

  const timezone =
    (profileRes.data as { timezone?: string } | null)?.timezone ??
    'Europe/Warsaw'

  return { services, products, timezone, productCostMap }
}
