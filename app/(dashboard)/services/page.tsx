import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { ServiceForm } from '@/components/service-form'
import { DeleteServiceButton } from '@/components/delete-service-button'

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Services</h1>
        <ServiceForm>
          <Button>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicesData.map((service: any) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.duration_minutes} min</TableCell>
                    <TableCell>${service.base_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={service.active ? 'default' : 'secondary'}>
                        {service.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ServiceForm service={service}>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </ServiceForm>
                        <DeleteServiceButton service={service} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

