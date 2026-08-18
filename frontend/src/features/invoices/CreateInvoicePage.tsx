import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createInvoice } from '@/lib/api/invoices';
import { getErrorMessage } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import {
  CURRENCIES,
  createInvoiceDefaults,
  createInvoiceSchema,
  emptyInvoiceItem,
  todayDateString,
  type CreateInvoiceFormValues,
} from './create-invoice.schema';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-destructive">
      {message}
    </p>
  );
}

export function CreateInvoicePage() {
  const navigate = useNavigate();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: createInvoiceDefaults,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      toast.success('Invoice created successfully');
      navigate('/');
    },
    onError: (error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        setError('invoiceNumber', { message: 'This invoice number already exists' });
        return;
      }
      toast.error(getErrorMessage(error));
    },
  });

  const [items, currency, invoiceDate] = watch(['items', 'currency', 'invoiceDate']);
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
  const rowAmount = (quantity: string, rate: string) =>
    Number.isFinite(Number(quantity)) && Number.isFinite(Number(rate))
      ? Number(quantity) * Number(rate)
      : 0;
  const itemsSubtotal = items.reduce((sum, item) => sum + rowAmount(item.quantity, item.rate), 0);
  // Due date can't be before the invoice date (server enforces the same
  // rule) — the native date picker's `min` blocks picking an invalid date
  // in the first place instead of only flagging it after the fact.
  const dueDateMin = invoiceDate || todayDateString();

  const onSubmit = (values: CreateInvoiceFormValues) => {
    mutation.mutate({
      invoiceNumber: values.invoiceNumber,
      invoiceReference: values.invoiceReference || undefined,
      invoiceDate: values.invoiceDate,
      dueDate: values.dueDate,
      currency: values.currency,
      currencySymbol: values.currencySymbol,
      description: values.description || undefined,
      customer: {
        fullname: values.customerFullname,
        email: values.customerEmail,
        mobileNumber: values.customerMobile || undefined,
        address: values.customerAddress || undefined,
      },
      items: values.items.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
      })),
      taxPercent: Number(values.taxPercent),
      discount: Number(values.discount),
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Invoice</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a new invoice and save it as a draft.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Invoice information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="invoiceNumber">Invoice number *</Label>
              <Input
                id="invoiceNumber"
                className="mt-1.5"
                aria-invalid={!!errors.invoiceNumber}
                aria-describedby={errors.invoiceNumber ? 'invoiceNumber-error' : undefined}
                {...register('invoiceNumber')}
              />
              <FieldError id="invoiceNumber-error" message={errors.invoiceNumber?.message} />
            </div>
            <div>
              <Label htmlFor="invoiceReference">Invoice reference</Label>
              <Input
                id="invoiceReference"
                className="mt-1.5"
                placeholder="e.g. Website project"
                {...register('invoiceReference')}
              />
            </div>
            <div>
              <Label htmlFor="invoiceDate">Invoice date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                className="mt-1.5"
                aria-invalid={!!errors.invoiceDate}
                aria-describedby={errors.invoiceDate ? 'invoiceDate-error' : undefined}
                {...register('invoiceDate')}
              />
              <FieldError id="invoiceDate-error" message={errors.invoiceDate?.message} />
            </div>
            <div>
              <Label htmlFor="dueDate">Due date *</Label>
              <Input
                id="dueDate"
                type="date"
                min={dueDateMin}
                className="mt-1.5"
                aria-invalid={!!errors.dueDate}
                aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
                {...register('dueDate')}
              />
              <FieldError id="dueDate-error" message={errors.dueDate?.message} />
            </div>
            <div>
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={currency}
                onValueChange={(value) => {
                  const match = CURRENCIES.find((c) => c.code === value);
                  setValue('currency', value);
                  setValue('currencySymbol', match?.symbol ?? '');
                }}
              >
                <SelectTrigger id="currency" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} · {c.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              className="mt-1.5"
              placeholder="Add a note for your customer"
              {...register('description')}
            />
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Customer</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="customerFullname">Customer name *</Label>
              <Input
                id="customerFullname"
                className="mt-1.5"
                aria-invalid={!!errors.customerFullname}
                aria-describedby={errors.customerFullname ? 'customerFullname-error' : undefined}
                {...register('customerFullname')}
              />
              <FieldError id="customerFullname-error" message={errors.customerFullname?.message} />
            </div>
            <div>
              <Label htmlFor="customerEmail">Customer email *</Label>
              <Input
                id="customerEmail"
                type="email"
                className="mt-1.5"
                aria-invalid={!!errors.customerEmail}
                aria-describedby={errors.customerEmail ? 'customerEmail-error' : undefined}
                {...register('customerEmail')}
              />
              <FieldError id="customerEmail-error" message={errors.customerEmail?.message} />
            </div>
            <div>
              <Label htmlFor="customerMobile">Customer mobile</Label>
              <Input id="customerMobile" className="mt-1.5" {...register('customerMobile')} />
            </div>
            <div>
              <Label htmlFor="customerAddress">Customer address</Label>
              <Input id="customerAddress" className="mt-1.5" {...register('customerAddress')} />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Invoice items</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(emptyInvoiceItem)}
            >
              <Plus className="size-4" />
              Add item
            </Button>
          </div>

          {errors.items?.root?.message && (
            <FieldError id="items-error" message={errors.items.root.message} />
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                data-testid={`item-row-${index}`}
                className="grid grid-cols-1 gap-4 border-b border-border pb-4 last:border-0 last:pb-0 sm:grid-cols-[1fr_140px_140px_auto] sm:items-start"
              >
                <div>
                  <Label htmlFor={`items.${index}.name`}>Item name *</Label>
                  <Input
                    id={`items.${index}.name`}
                    className="mt-1.5"
                    aria-invalid={!!errors.items?.[index]?.name}
                    aria-describedby={errors.items?.[index]?.name ? `items.${index}.name-error` : undefined}
                    {...register(`items.${index}.name` as const)}
                  />
                  <FieldError
                    id={`items.${index}.name-error`}
                    message={errors.items?.[index]?.name?.message}
                  />
                </div>
                <div>
                  <Label htmlFor={`items.${index}.quantity`}>Quantity *</Label>
                  <Input
                    id={`items.${index}.quantity`}
                    type="number"
                    step="1"
                    min="1"
                    className="mt-1.5"
                    aria-invalid={!!errors.items?.[index]?.quantity}
                    aria-describedby={
                      errors.items?.[index]?.quantity ? `items.${index}.quantity-error` : undefined
                    }
                    {...register(`items.${index}.quantity` as const)}
                  />
                  <FieldError
                    id={`items.${index}.quantity-error`}
                    message={errors.items?.[index]?.quantity?.message}
                  />
                </div>
                <div>
                  <Label htmlFor={`items.${index}.rate`}>Rate *</Label>
                  <Input
                    id={`items.${index}.rate`}
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1.5"
                    aria-invalid={!!errors.items?.[index]?.rate}
                    aria-describedby={errors.items?.[index]?.rate ? `items.${index}.rate-error` : undefined}
                    {...register(`items.${index}.rate` as const)}
                  />
                  <FieldError
                    id={`items.${index}.rate-error`}
                    message={errors.items?.[index]?.rate?.message}
                  />
                </div>
                <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-end sm:gap-1.5">
                  <span className="mt-1.5 text-sm text-muted-foreground sm:mt-6">
                    {formatMoney(rowAmount(items[index]?.quantity ?? '', items[index]?.rate ?? ''), currencySymbol)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove item"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Items subtotal</span>
            <span className="font-semibold" data-testid="items-subtotal">
              {formatMoney(itemsSubtotal, currencySymbol)}
            </span>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Tax & discount</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="taxPercent">Tax (%)</Label>
              <Input
                id="taxPercent"
                type="number"
                step="0.01"
                min="0"
                className="mt-1.5"
                aria-invalid={!!errors.taxPercent}
                aria-describedby={errors.taxPercent ? 'taxPercent-error' : undefined}
                {...register('taxPercent')}
              />
              <FieldError id="taxPercent-error" message={errors.taxPercent?.message} />
            </div>
            <div>
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                className="mt-1.5"
                aria-invalid={!!errors.discount}
                aria-describedby={errors.discount ? 'discount-error' : undefined}
                {...register('discount')}
              />
              <FieldError id="discount-error" message={errors.discount?.message} />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 text-white hover:bg-blue-500"
            disabled={isSubmitting || mutation.isPending}
          >
            {mutation.isPending ? 'Creating…' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
