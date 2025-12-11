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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Products Inventory</h1>
        <div className="flex gap-2">
          <ProductImportDialog>
            <Button variant="outline" className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-2" />
              Import Products
            </Button>
          </ProductImportDialog>
          <ProductForm>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </ProductForm>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
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
