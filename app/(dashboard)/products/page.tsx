import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Upload } from 'lucide-react'
import { ProductForm } from '@/components/product-form'
import { SortableProductsTable } from '@/components/sortable-products-table'
import { ProductImportDialog } from '@/components/product-import-dialog'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  // Cast to any[] to handle Supabase's dynamic typing
  const productsData = (products as any[]) || []

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}>
          Products Inventory
        </h1>
        <div className="flex gap-2">
          <ProductImportDialog>
            <Button variant="outline" className="w-full sm:w-auto shadow-sm">
              <Upload className="h-4 w-4 mr-2" />
              Import Products
            </Button>
          </ProductImportDialog>
          <ProductForm>
            <Button className="w-full sm:w-auto shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </ProductForm>
        </div>
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}>
            All Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productsData && productsData.length > 0 ? (
            <SortableProductsTable products={productsData} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No products yet. Add your first product to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
