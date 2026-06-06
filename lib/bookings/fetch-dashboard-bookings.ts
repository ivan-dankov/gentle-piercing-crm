import type { SupabaseClient } from '@supabase/supabase-js'

const DASHBOARD_BOOKINGS_SELECT = `
  id,
  total_paid,
  profit,
  earring_cost,
  earring_qty,
  earring_revenue,
  travel_fee,
  booksy_fee,
  broken_earring_loss,
  tax_amount,
  start_time,
  service_id,
  service_price,
  earring_id,
  service:services(
    id,
    name
  ),
  product:products(
    id,
    name
  ),
  booking_products(
    id,
    qty,
    price,
    product:products(
      id,
      name
    )
  ),
  booking_services(
    id,
    service_id,
    price,
    service:services(
      id,
      name
    )
  )
`

const PAGE_SIZE = 1000

export async function fetchDashboardBookings(
  supabase: SupabaseClient,
  filters?: { from?: Date; to?: Date }
) {
  const allBookings: unknown[] = []
  let from = 0

  while (true) {
    let query = supabase
      .from('bookings')
      .select(DASHBOARD_BOOKINGS_SELECT)
      .order('start_time', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (filters?.from) {
      query = query.gte('start_time', filters.from.toISOString())
    }
    if (filters?.to) {
      query = query.lte('start_time', filters.to.toISOString())
    }

    const { data, error } = await query
    if (error) {
      throw error
    }

    const page = data ?? []
    allBookings.push(...page)

    if (page.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return allBookings
}
