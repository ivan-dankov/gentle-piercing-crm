import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { EarringForm } from '@/components/earring-form'
import { DeleteEarringButton } from '@/components/delete-earring-button'

export const dynamic = 'force-dynamic'

export default async function EarringsPage() {
  const supabase = await createClient()
  const { data: earrings } = await supabase
    .from('earrings')
    .select('*')
    .order('created_at', { ascending: false })

  // Cast to any[] to handle Supabase's dynamic typing
  const earringsData = (earrings as any[]) || []

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Earrings Inventory</h1>
        <EarringForm>
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Earring
          </Button>
        </EarringForm>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Earrings</CardTitle>
        </CardHeader>
        <CardContent>
          {earringsData && earringsData.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {earringsData.map((earring: any) => {
                  const costDisplay = earring.cost ? `$${earring.cost.toFixed(2)}` : '-'
                  return (
                    <Card key={earring.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg">{earring.name}</h3>
                            {earring.category && (
                              <p className="text-sm text-muted-foreground">{earring.category}</p>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cost:</span>
                              <span>{costDisplay}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sale Price:</span>
                              <span>${earring.sale_price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Stock:</span>
                              <Badge variant={earring.stock_qty > 0 ? 'default' : 'destructive'}>
                                {earring.stock_qty}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sold:</span>
                              <span>{earring.sold_qty}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge variant={earring.active ? 'default' : 'secondary'}>
                                {earring.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <EarringForm earring={earring}>
                              <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                            </EarringForm>
                            <DeleteEarringButton earring={earring} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Sold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earringsData.map((earring: any) => {
                      const costDisplay = earring.cost ? `$${earring.cost.toFixed(2)}` : '-'
                      
                      const profitMargin = earring.cost
                        ? (((earring.sale_price - (earring.cost || 0)) / earring.sale_price) * 100).toFixed(1)
                        : '-'
                      
                      return (
                        <TableRow key={earring.id}>
                          <TableCell className="font-medium">{earring.name}</TableCell>
                          <TableCell>{earring.category || '-'}</TableCell>
                          <TableCell className="text-sm">{costDisplay}</TableCell>
                          <TableCell>${earring.sale_price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={earring.stock_qty > 0 ? 'default' : 'destructive'}>
                              {earring.stock_qty}
                            </Badge>
                          </TableCell>
                          <TableCell>{earring.sold_qty}</TableCell>
                          <TableCell>
                            <Badge variant={earring.active ? 'default' : 'secondary'}>
                              {earring.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <EarringForm earring={earring}>
                                <Button variant="ghost" size="sm">Edit</Button>
                              </EarringForm>
                              <DeleteEarringButton earring={earring} />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No earrings yet. Add your first earring to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

