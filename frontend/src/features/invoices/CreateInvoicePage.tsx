import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
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
  type CreateInvoiceFormValues,
} from './create-invoice.schema';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-destructive">{message}</p>;
}

export function CreateInvoicePage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: createInvoiceDefaults,
  });

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

  const [quantity, rate, currency] = watch(['itemQuantity', 'itemRate', 'currency']);
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
  const itemAmount =
    Number.isFinite(Number(quantity)) && Number.isFinite(Number(rate))
      ? Number(quantity) * Number(rate)
      : 0;

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
      item: {
        name: values.itemName,
        quantity: Number(values.itemQuantity),
        rate: Number(values.itemRate),
      },
      taxPercent: Number(values.taxPercent),
      discount: Number(values.discount),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
                {...register('invoiceNumber')}
              />
              <FieldError message={errors.invoiceNumber?.message} />
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
                {...register('invoiceDate')}
              />
              <FieldError message={errors.invoiceDate?.message} />
            </div>
            <div>
              <Label htmlFor="dueDate">Due date *</Label>
              <Input
                id="dueDate"
                type="date"
                className="mt-1.5"
                aria-invalid={!!errors.dueDate}
                {...register('dueDate')}
              />
              <FieldError message={errors.dueDate?.message} />
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
                {...register('customerFullname')}
              />
              <FieldError message={errors.customerFullname?.message} />
            </div>
            <div>
              <Label htmlFor="customerEmail">Customer email *</Label>
              <Input
                id="customerEmail"
                type="email"
                className="mt-1.5"
                aria-invalid={!!errors.customerEmail}
                {...register('customerEmail')}
              />
              <FieldError message={errors.customerEmail?.message} />
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
          <h2 className="text-sm font-semibold">Invoice item</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="itemName">Item name *</Label>
              <Input
                id="itemName"
                className="mt-1.5"
                aria-invalid={!!errors.itemName}
                {...register('itemName')}
              />
              <FieldError message={errors.itemName?.message} />
            </div>
            <div>
              <Label htmlFor="itemQuantity">Quantity *</Label>
              <Input
                id="itemQuantity"
                type="number"
                step="1"
                min="1"
                className="mt-1.5"
                aria-invalid={!!errors.itemQuantity}
                {...register('itemQuantity')}
              />
              <FieldError message={errors.itemQuantity?.message} />
            </div>
            <div>
              <Label htmlFor="itemRate">Rate *</Label>
              <Input
                id="itemRate"
                type="number"
                step="0.01"
                min="0"
                className="mt-1.5"
                aria-invalid={!!errors.itemRate}
                {...register('itemRate')}
              />
              <FieldError message={errors.itemRate?.message} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Item amount</span>
            <span className="font-semibold">{formatMoney(itemAmount, currencySymbol)}</span>
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
                {...register('taxPercent')}
              />
              <FieldError message={errors.taxPercent?.message} />
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
                {...register('discount')}
              />
              <FieldError message={errors.discount?.message} />
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
