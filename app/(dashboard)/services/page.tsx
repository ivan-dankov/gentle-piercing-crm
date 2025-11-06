import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { ServiceForm } from '@/components/service-form'
import { SortableServicesTable } from '@/components/sortable-services-table'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false })

  // Cast to any[] to handle Supabase's dynamic typing
  const servicesData = (services as any[]) || []

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Services</h1>
        <ServiceForm>
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </ServiceForm>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
        </CardHeader>
        <CardContent>
          {servicesData && servicesData.length > 0 ? (
            <SortableServicesTable services={servicesData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No services yet. Add your first service to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

