import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { EarringForm } from '@/components/earring-form'
import { SortableEarringsTable } from '@/components/sortable-earrings-table'

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
            <SortableEarringsTable earrings={earringsData} />
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

