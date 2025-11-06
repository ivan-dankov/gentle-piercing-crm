import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { AdditionalCostForm } from '@/components/additional-cost-form'
import { SortableAdditionalCostsTable } from '@/components/sortable-additional-costs-table'

export const dynamic = 'force-dynamic'

export default async function AdditionalCostsPage() {
  const supabase = await createClient()
  const { data: costs } = await supabase
    .from('additional_costs')
    .select('*')
    .order('date', { ascending: false })

  // Cast to any[] to handle Supabase's dynamic typing
  const costsData = (costs as any[]) || []

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Additional Costs</h1>
        <AdditionalCostForm>
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Cost
          </Button>
        </AdditionalCostForm>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Additional Costs</CardTitle>
        </CardHeader>
        <CardContent>
          {costsData && costsData.length > 0 ? (
            <SortableAdditionalCostsTable costs={costsData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No additional costs yet. Add your first cost to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

