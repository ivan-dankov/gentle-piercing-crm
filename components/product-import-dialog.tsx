'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader } from '@/components/ui/loader'
import { createClient } from '@/lib/supabase/client'
import { Upload } from 'lucide-react'

interface ProductImportDialogProps {
  children: React.ReactNode
}

interface ParsedRow {
  sku: string | null
  name: string | null
  cost: number | null
  sale_price: number | null
}

export function ProductImportDialog({ children }: ProductImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pastedData, setPastedData] = useState('')
  const [columnMapping, setColumnMapping] = useState({
    sku: '__none__',
    name: '__none__',
    cost: '__none__',
    sale_price: '__none__',
  })
  const router = useRouter()
  const supabase = createClient()

  // Parse pasted data and detect delimiter
  const parseData = (text: string): string[][] => {
    const lines = text.trim().split('\n').filter(line => line.trim())
    if (lines.length === 0) return []

    // Detect delimiter (tab or comma)
    const firstLine = lines[0]
    const hasTabs = firstLine.includes('\t')
    const delimiter = hasTabs ? '\t' : ','

    return lines.map(line => {
      // Handle quoted values
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    })
  }

  // Get column headers from first row
  const parsedRows = useMemo(() => {
    if (!pastedData.trim()) return []
    return parseData(pastedData)
  }, [pastedData])

  const headers = parsedRows.length > 0 ? parsedRows[0] : []
  const dataRows = parsedRows.slice(1)

  // Parse products based on column mapping
  const parsedProducts = useMemo(() => {
    if (!columnMapping.name || columnMapping.name === '__none__' || dataRows.length === 0) return []

    return dataRows
      .map((row): ParsedRow | null => {
        const nameIndex = headers.indexOf(columnMapping.name)
        if (nameIndex === -1 || !row[nameIndex]?.trim()) return null

        const skuIndex = columnMapping.sku && columnMapping.sku !== '__none__' ? headers.indexOf(columnMapping.sku) : -1
        const costIndex = columnMapping.cost && columnMapping.cost !== '__none__' ? headers.indexOf(columnMapping.cost) : -1
        const salePriceIndex = columnMapping.sale_price && columnMapping.sale_price !== '__none__' ? headers.indexOf(columnMapping.sale_price) : -1

        const name = row[nameIndex]?.trim() || null
        const sku = skuIndex >= 0 && row[skuIndex] ? row[skuIndex].trim() || null : null
        const cost = costIndex >= 0 && row[costIndex] ? parseFloat(row[costIndex].replace(/[^0-9.-]/g, '')) || null : null
        const salePrice = salePriceIndex >= 0 && row[salePriceIndex] ? parseFloat(row[salePriceIndex].replace(/[^0-9.-]/g, '')) || null : null

        return { name, sku, cost, sale_price: salePrice }
      })
      .filter((p): p is ParsedRow => p !== null && p.name !== null)
  }, [dataRows, headers, columnMapping])

  const handleImport = async () => {
    if (parsedProducts.length === 0) {
      alert('No valid products to import')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to import products')
      }

      const productsToInsert = parsedProducts.map(p => ({
        name: p.name!,
        sku: p.sku || null,
        cost: p.cost,
        sale_price: p.sale_price || 0,
        sold_qty: 0,
        active: true,
        user_id: user.id,
      }))

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert)

      if (error) throw error

      setOpen(false)
      setPastedData('')
      setColumnMapping({ sku: '', name: '', cost: '', sale_price: '' })
      router.refresh()
    } catch (error: any) {
      console.error('Error importing products:', error)
      alert(`Failed to import products: ${error?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products from Google Sheets</DialogTitle>
          <DialogDescription>
            Paste your data from Google Sheets. The first row should contain column headers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="pasted-data">Paste your data here</Label>
            <Textarea
              id="pasted-data"
              placeholder="Paste your Google Sheets data here (TSV or CSV format)..."
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {headers.length > 0 && (
            <div className="space-y-4">
              <div>
                <Label>Map Columns</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select which column corresponds to each field. Only Name is required.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name-column">Name *</Label>
                  <Select
                    value={columnMapping.name === '__none__' ? undefined : columnMapping.name}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, name: value || '__none__' })}
                  >
                    <SelectTrigger id="name-column">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sku-column">SKU</Label>
                  <Select
                    value={columnMapping.sku === '__none__' ? undefined : columnMapping.sku}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, sku: value === '__none__' ? '__none__' : value })}
                  >
                    <SelectTrigger id="sku-column">
                      <SelectValue placeholder="Select column (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {headers.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cost-column">Cost</Label>
                  <Select
                    value={columnMapping.cost === '__none__' ? undefined : columnMapping.cost}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, cost: value === '__none__' ? '__none__' : value })}
                  >
                    <SelectTrigger id="cost-column">
                      <SelectValue placeholder="Select column (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {headers.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sale-price-column">Sale Price</Label>
                  <Select
                    value={columnMapping.sale_price === '__none__' ? undefined : columnMapping.sale_price}
                    onValueChange={(value) => setColumnMapping({ ...columnMapping, sale_price: value === '__none__' ? '__none__' : value })}
                  >
                    <SelectTrigger id="sale-price-column">
                      <SelectValue placeholder="Select column (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {headers.map((header, idx) => (
                        <SelectItem key={idx} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {parsedProducts.length > 0 && (
            <div>
              <Label>Preview ({parsedProducts.length} products)</Label>
              <div className="mt-2 max-h-[200px] overflow-y-auto rounded border p-3">
                <div className="space-y-2">
                  {parsedProducts.slice(0, 10).map((product, idx) => (
                    <div key={idx} className="text-sm border-b pb-2 last:border-0">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {product.sku && `SKU: ${product.sku} • `}
                        {product.cost !== null && `Cost: $${product.cost.toFixed(2)} • `}
                        {product.sale_price !== null && `Sale: $${product.sale_price.toFixed(2)}`}
                      </div>
                    </div>
                  ))}
                  {parsedProducts.length > 10 && (
                    <div className="text-sm text-muted-foreground pt-2">
                      ... and {parsedProducts.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false)
              setPastedData('')
              setColumnMapping({ sku: '__none__', name: '__none__', cost: '__none__', sale_price: '__none__' })
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={loading || !columnMapping.name || columnMapping.name === '__none__' || parsedProducts.length === 0}
          >
            {loading ? (
              <>
                <Loader size="sm" className="mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {parsedProducts.length} Product{parsedProducts.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
