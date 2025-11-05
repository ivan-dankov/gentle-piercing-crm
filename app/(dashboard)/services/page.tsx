import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { ServiceForm } from '@/components/service-form'
import { DeleteServiceButton } from '@/components/delete-service-button'

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
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {servicesData.map((service: any) => (
                  <Card key={service.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span>{service.duration_minutes} min</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base Price:</span>
                            <span>${service.base_price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant={service.active ? 'default' : 'secondary'}>
                              {service.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <ServiceForm service={service}>
                            <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                          </ServiceForm>
                          <DeleteServiceButton service={service} />
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
              </div>
            </>
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

