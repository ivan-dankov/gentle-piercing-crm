import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { ClientForm } from '@/components/client-form'
import { SortableClientsTable } from '@/components/sortable-clients-table'

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}>
          Clients
        </h1>
        <ClientForm>
          <Button className="w-full sm:w-auto shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </ClientForm>
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}>
            All Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientsData && clientsData.length > 0 ? (
            <SortableClientsTable clients={clientsData} />
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

