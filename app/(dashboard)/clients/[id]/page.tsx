import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ClientForm } from '@/components/client-form'
import { DeleteClientButton } from '@/components/delete-client-button'
import { Edit } from 'lucide-react'
import Link from 'next/link'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) {
    notFound()
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      earring:earrings(*),
      service:services(*)
    `)
    .eq('client_id', id)
    .order('start_time', { ascending: false })

  const totalBookings = bookings?.length || 0
  const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_paid || 0), 0) || 0
  const totalProfit = bookings?.reduce((sum, b) => sum + (b.profit || 0), 0) || 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground mt-1">
            Client since {new Date(client.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClientForm client={client}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Client
            </Button>
          </ClientForm>
          <DeleteClientButton client={client} variant="destructive" redirectAfterDelete={true} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProfit.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{client.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Source</p>
              <p className="font-medium">{client.source || '-'}</p>
            </div>
            {client.notes && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings && bookings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Earring</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking: any) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      {new Date(booking.start_time).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{booking.service?.name || '-'}</TableCell>
                    <TableCell>{booking.earring?.name || '-'}</TableCell>
                    <TableCell>${booking.total_paid?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>${booking.profit?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/bookings/${booking.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No bookings yet for this client.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

