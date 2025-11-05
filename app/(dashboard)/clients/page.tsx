import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ClientForm } from '@/components/client-form'
import { DeleteClientButton } from '@/components/delete-client-button'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  // Cast to any[] to handle Supabase's dynamic typing
  const clientsData = (clients as any[]) || []

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Clients</h1>
        <ClientForm>
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </ClientForm>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clientsData && clientsData.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {clientsData.map((client: any) => (
                  <Card key={client.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div>
                          <Link href={`/clients/${client.id}`} className="hover:underline">
                            <h3 className="font-semibold text-lg">{client.name}</h3>
                          </Link>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone:</span>
                            <span>{client.phone || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Source:</span>
                            <span>{client.source || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Created:</span>
                            <span>{new Date(client.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Link href={`/clients/${client.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">View</Button>
                          </Link>
                          <DeleteClientButton client={client} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientsData.map((client: any) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <Link href={`/clients/${client.id}`} className="hover:underline">
                            {client.name}
                          </Link>
                        </TableCell>
                        <TableCell>{client.phone || '-'}</TableCell>
                        <TableCell>{client.source || '-'}</TableCell>
                        <TableCell>
                          {new Date(client.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/clients/${client.id}`}>
                              <Button variant="ghost" size="sm">View</Button>
                            </Link>
                            <DeleteClientButton client={client} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No clients yet. Add your first client to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

