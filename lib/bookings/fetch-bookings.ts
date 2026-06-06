import type { SupabaseClient } from '@supabase/supabase-js'

const BOOKINGS_SELECT = `
  *,
  client:clients(*),
  product:products(*),
  service:services(*),
  booking_products(
    id,
    product_id,
    qty,
    price,
    product:products(*)
  ),
  booking_services(
    id,
    service_id,
    price,
    service:services(*)
  ),
  booking_broken_products(
    id,
    product_id,
    qty,
    cost,
    product:products(*)
  )
`

const PAGE_SIZE = 1000

/**
 * Fetch all bookings with relations. Supabase/PostgREST caps each request at
 * 1000 rows by default, so we paginate to avoid missing recent bookings.
 */
export async function fetchAllBookings(supabase: SupabaseClient) {
  const allBookings: unknown[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('bookings')
      .select(BOOKINGS_SELECT)
      .order('start_time', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

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
