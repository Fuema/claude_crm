import { Link, useRouter } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { ErrorState } from '@/components/error-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InvoiceForm } from '@/features/invoices/components/invoice-form'
import {
  useCreateInvoice,
  useInvoice,
  useUpdateInvoice,
} from '@/features/invoices/hooks/use-invoices'
import { invoiceLabel } from '@/features/invoices/types/invoice'
import {
  type InvoiceFormValues,
  newInvoiceFormValues,
  toInvoiceFormValues,
} from '@/features/invoices/types/invoice-form-schema'
import { errorMessage } from '@/lib/error-message'

interface NewInvoicePageProps {
  /** Preselects the customer, e.g. when coming from its page. */
  customerId?: string
}

/** A new draft. Saving opens the invoice. */
export function NewInvoicePage({ customerId }: NewInvoicePageProps) {
  const formId = useId()
  const router = useRouter()
  const createInvoice = useCreateInvoice()
  // One key per new draft: a retried save is not created twice.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  async function handleSubmit(values: InvoiceFormValues) {
    const invoice = await createInvoice.mutateAsync({ values, idempotencyKey })
    await router.navigate({
      to: '/invoices/$invoiceId',
      params: { invoiceId: invoice.id },
    })
  }

  return (
    <EditorLayout
      title="New invoice"
      formId={formId}
      isPending={createInvoice.isPending}
      backTo={{ label: 'Back to invoices', to: '/invoices' }}
    >
      <InvoiceForm
        id={formId}
        defaultValues={newInvoiceFormValues(customerId)}
        onSubmit={handleSubmit}
      />
    </EditorLayout>
  )
}

/** Editing a draft (rule 28: only drafts can be edited). */
export function EditInvoicePage({ invoiceId }: { invoiceId: string }) {
  const formId = useId()
  const router = useRouter()
  const invoice = useInvoice(invoiceId)
  const updateInvoice = useUpdateInvoice()

  if (invoice.isPending) {
    return <Skeleton className="h-96 w-full" />
  }
  if (invoice.error) {
    return (
      <ErrorState
        message={errorMessage(invoice.error)}
        onRetry={() => void invoice.refetch()}
      />
    )
  }
  const data = invoice.data
  const openInvoice = () =>
    router.navigate({
      to: '/invoices/$invoiceId',
      params: { invoiceId },
    })

  if (data.status !== 'draft' || data.customer.isArchived) {
    return (
      <ErrorState
        title="This invoice cannot be edited"
        message={
          data.customer.isArchived
            ? 'Its customer is archived. Restore the customer to change its draft invoices.'
            : 'Only a draft invoice can be edited.'
        }
        onRetry={() => void openInvoice()}
      />
    )
  }

  async function handleSubmit(values: InvoiceFormValues) {
    await updateInvoice.mutateAsync({ id: invoiceId, values })
    await openInvoice()
  }

  return (
    <EditorLayout
      title={`Edit ${invoiceLabel(data).toLowerCase()}`}
      formId={formId}
      isPending={updateInvoice.isPending}
      backTo={{
        label: 'Back to the invoice',
        to: '/invoices/$invoiceId',
        invoiceId,
      }}
    >
      <InvoiceForm
        id={formId}
        defaultValues={toInvoiceFormValues(data)}
        fixedCustomer={{ id: data.customer.id, name: data.customer.name }}
        onSubmit={handleSubmit}
      />
    </EditorLayout>
  )
}

type BackTo =
  | { label: string; to: '/invoices' }
  | { label: string; to: '/invoices/$invoiceId'; invoiceId: string }

function EditorLayout({
  title,
  formId,
  isPending,
  backTo,
  children,
}: {
  title: string
  formId: string
  isPending: boolean
  backTo: BackTo
  children: React.ReactNode
}) {
  const back =
    backTo.to === '/invoices' ? (
      <Link to="/invoices">
        <ArrowLeftIcon aria-hidden="true" />
        {backTo.label}
      </Link>
    ) : (
      <Link to="/invoices/$invoiceId" params={{ invoiceId: backTo.invoiceId }}>
        <ArrowLeftIcon aria-hidden="true" />
        {backTo.label}
      </Link>
    )
  return (
    <div className="flex flex-col gap-2">
      <Button asChild variant="link" className="self-start px-0">
        {back}
      </Button>
      <PageHeader
        title={title}
        actions={
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save draft'}
          </Button>
        }
      />
      {children}
      <div className="mt-6 flex justify-end">
        <Button type="submit" form={formId} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save draft'}
        </Button>
      </div>
    </div>
  )
}
