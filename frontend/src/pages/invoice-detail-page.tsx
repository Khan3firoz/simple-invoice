import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import type { Invoice } from '@/types/invoice'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'

function formatMoney(amount: number, currencySymbol: string) {
  return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await api.get<Invoice>(`/invoices/${id}`)
      return res.data
    },
    enabled: !!id,
  })

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
        <ArrowLeft className="h-4 w-4" />
        Back to invoices
      </Button>

      {isLoading && <p className="text-muted-foreground">Loading invoice...</p>}
      {isError && <p className="text-destructive">Failed to load this invoice.</p>}

      {invoice && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-xl">Invoice {invoice.invoiceNumber}</CardTitle>
                {invoice.invoiceReference && (
                  <p className="text-sm text-muted-foreground">Ref: {invoice.invoiceReference}</p>
                )}
              </div>
              <StatusBadge status={invoice.status} />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Currency</p>
                  <p className="font-medium">{invoice.currency}</p>
                </div>
              </div>

              {invoice.description && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium">{invoice.description}</p>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Line Items</h3>
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left font-medium">Item</th>
                        <th className="p-3 text-right font-medium">Qty</th>
                        <th className="p-3 text-right font-medium">Rate</th>
                        <th className="p-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">
                            {formatMoney(item.rate, invoice.currencySymbol)}
                          </td>
                          <td className="p-3 text-right">
                            {formatMoney(item.quantity * item.rate, invoice.currencySymbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Customer</h3>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{invoice.customerFullname}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{invoice.customerEmail}</p>
                  </div>
                  {invoice.customerMobileNumber && (
                    <div>
                      <p className="text-muted-foreground">Mobile</p>
                      <p className="font-medium">{invoice.customerMobileNumber}</p>
                    </div>
                  )}
                  {invoice.customerAddress && (
                    <div>
                      <p className="text-muted-foreground">Address</p>
                      <p className="font-medium">{invoice.customerAddress}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(invoice.invoiceSubTotal, invoice.currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({invoice.taxPercent}%)</span>
                <span>{formatMoney(invoice.totalTax, invoice.currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatMoney(invoice.totalDiscount, invoice.currencySymbol)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 font-semibold">
                <span>Total</span>
                <span>{formatMoney(invoice.totalAmount, invoice.currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>{formatMoney(invoice.totalPaid, invoice.currencySymbol)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 font-semibold">
                <span>Balance Due</span>
                <span>{formatMoney(invoice.balanceAmount, invoice.currencySymbol)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
