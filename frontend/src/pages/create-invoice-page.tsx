import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, extractErrorMessage } from '@/lib/api'
import type { CreateInvoicePayload } from '@/types/invoice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const createInvoiceSchema = z
  .object({
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    invoiceReference: z.string().optional(),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    currency: z.string().min(1, 'Currency is required'),
    description: z.string().optional(),
    customerFullname: z.string().min(1, 'Customer name is required'),
    customerEmail: z.string().min(1, 'Customer email is required').email('Enter a valid email'),
    customerMobileNumber: z.string().optional(),
    customerAddress: z.string().optional(),
    itemName: z.string().min(1, 'Item name is required'),
    itemQuantity: z.coerce.number().int('Must be a whole number').positive('Must be positive'),
    itemRate: z.coerce.number().positive('Must be a positive number'),
    taxPercent: z.coerce.number().min(0, 'Cannot be negative'),
    discount: z.coerce.number().min(0, 'Cannot be negative'),
  })
  .refine((data) => data.dueDate >= data.invoiceDate, {
    message: 'Due date must be on or after the invoice date',
    path: ['dueDate'],
  })

type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>

const CURRENCIES = ['AUD', 'USD', 'GBP', 'SGD', 'EUR']

export function CreateInvoicePage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      currency: 'AUD',
      taxPercent: 10,
      discount: 0,
      invoiceDate: new Date().toISOString().slice(0, 10),
    },
  })

  async function onSubmit(values: CreateInvoiceFormValues) {
    setIsSubmitting(true)
    try {
      const payload: CreateInvoicePayload = {
        invoiceNumber: values.invoiceNumber,
        invoiceReference: values.invoiceReference || undefined,
        invoiceDate: values.invoiceDate,
        dueDate: values.dueDate,
        currency: values.currency,
        description: values.description || undefined,
        customer: {
          fullname: values.customerFullname,
          email: values.customerEmail,
          mobileNumber: values.customerMobileNumber || undefined,
          address: values.customerAddress || undefined,
        },
        item: {
          name: values.itemName,
          quantity: values.itemQuantity,
          rate: values.itemRate,
        },
        taxPercent: values.taxPercent,
        discount: values.discount,
      }
      await api.post('/invoices', payload)
      toast.success('Invoice created successfully')
      navigate('/')
    } catch (error) {
      toast.error(extractErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Create Invoice</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="invoiceNumber" label="Invoice Number" error={errors.invoiceNumber?.message}>
              <Input {...register('invoiceNumber')} placeholder="IV-0001" />
            </Field>
            <Field
              id="invoiceReference"
              label="Invoice Reference (optional)"
              error={errors.invoiceReference?.message}
            >
              <Input {...register('invoiceReference')} placeholder="#1234567" />
            </Field>
            <Field id="invoiceDate" label="Invoice Date" error={errors.invoiceDate?.message}>
              <Input type="date" {...register('invoiceDate')} />
            </Field>
            <Field id="dueDate" label="Due Date" error={errors.dueDate?.message}>
              <Input type="date" {...register('dueDate')} />
            </Field>
            <Field id="currency" label="Currency" error={errors.currency?.message}>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                {...register('currency')}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="description" label="Description (optional)" error={errors.description?.message}>
              <Input {...register('description')} placeholder="Invoice for..." />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="customerFullname" label="Customer Name" error={errors.customerFullname?.message}>
              <Input {...register('customerFullname')} placeholder="Jane Doe" />
            </Field>
            <Field id="customerEmail" label="Customer Email" error={errors.customerEmail?.message}>
              <Input type="email" {...register('customerEmail')} placeholder="jane@example.com" />
            </Field>
            <Field
              id="customerMobileNumber"
              label="Mobile (optional)"
              error={errors.customerMobileNumber?.message}
            >
              <Input {...register('customerMobileNumber')} placeholder="+65 9000 0000" />
            </Field>
            <Field id="customerAddress" label="Address (optional)" error={errors.customerAddress?.message}>
              <Input {...register('customerAddress')} placeholder="123 Example St" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Item</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="itemName" label="Item Name" error={errors.itemName?.message} className="sm:col-span-2">
              <Input {...register('itemName')} placeholder="Consulting services" />
            </Field>
            <Field id="itemQuantity" label="Quantity" error={errors.itemQuantity?.message}>
              <Input type="number" step="1" min="1" {...register('itemQuantity')} />
            </Field>
            <Field id="itemRate" label="Rate" error={errors.itemRate?.message}>
              <Input type="number" step="0.01" min="0" {...register('itemRate')} />
            </Field>
            <Field id="taxPercent" label="Tax (%)" error={errors.taxPercent?.message}>
              <Input type="number" step="0.01" min="0" {...register('taxPercent')} />
            </Field>
            <Field id="discount" label="Discount" error={errors.discount?.message}>
              <Input type="number" step="0.01" min="0" {...register('discount')} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  children,
  className,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
  className?: string
}) {
  const control = isValidElement(children) ? cloneElement(children as ReactElement<{ id?: string }>, { id }) : children
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
