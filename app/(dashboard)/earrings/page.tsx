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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Earrings Inventory</h1>
        <EarringForm>
          <Button>
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

