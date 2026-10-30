import { getRouteApi, Link } from '@tanstack/react-router'
import { FileTextIcon, PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { DataTable, PAGE_SIZE_OPTIONS } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCustomerOptions } from '@/features/customers'
import { invoiceColumns } from '@/features/invoices/components/invoice-columns'
import { useInvoices } from '@/features/invoices/hooks/use-invoices'
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
  invoiceStatusSchema,
} from '@/features/invoices/types/invoice'
import {
  DEFAULT_PAGE_SIZE,
  type InvoiceSearch,
  toInvoiceListParams,
} from '@/features/invoices/types/invoice-search'
import { errorMessage } from '@/lib/error-message'

const route = getRouteApi('/_authenticated/invoices/')

const ALL = 'all'

export function InvoicesPage() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const params = toInvoiceListParams(search)
  const invoices = useInvoices(params)
  const customers = useCustomerOptions('all')
  const statusId = useId()
  const customerId = useId()

  function setFilter(changes: Pick<InvoiceSearch, 'status' | 'customer'>) {
    void navigate({
      search: (previous) => ({ ...previous, ...changes, page: undefined }),
    })
  }

  const newInvoiceButton = (
    <Button asChild>
      <Link to="/invoices/new">
        <PlusIcon aria-hidden="true" />
        New invoice
      </Link>
    </Button>
  )

  const toolbar = (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={statusId}>Status</Label>
        <Select
          value={params.status ?? ALL}
          onValueChange={(value) => {
            const status = invoiceStatusSchema.safeParse(value)
            setFilter({ status: status.success ? status.data : undefined })
          }}
        >
          <SelectTrigger id={statusId} className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {INVOICE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {INVOICE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={customerId}>Customer</Label>
        <Select
          value={params.customerId ?? ALL}
          onValueChange={(value) =>
            setFilter({ customer: value === ALL ? undefined : value })
          }
          disabled={!customers.data}
        >
          <SelectTrigger id={customerId} className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All customers</SelectItem>
            {(customers.data ?? []).map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.isArchived
                  ? `${customer.name} (archived)`
                  : customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Bills to your customers, each in its own currency."
        actions={newInvoiceButton}
      />
      <DataTable
        caption="Invoices"
        columns={invoiceColumns}
        data={invoices.data?.items ?? []}
        getRowId={(invoice) => invoice.id}
        pagination={{
          page: params.page,
          pageSize: params.pageSize,
          total: invoices.data?.total ?? 0,
        }}
        onPaginationChange={({ page, pageSize }) =>
          void navigate({
            search: (previous) => ({
              ...previous,
              page: page > 1 ? page : undefined,
              pageSize:
                pageSize === DEFAULT_PAGE_SIZE
                  ? undefined
                  : PAGE_SIZE_OPTIONS.find((size) => size === pageSize),
            }),
          })
        }
        toolbar={toolbar}
        isLoading={invoices.isPending}
        errorMessage={invoices.error ? errorMessage(invoices.error) : undefined}
        onRetry={() => void invoices.refetch()}
        emptyState={
          <EmptyState
            icon={FileTextIcon}
            title={
              params.status || params.customerId
                ? 'No matching invoices'
                : 'No invoices yet'
            }
            description="Create a draft, add its lines, and send it when it is ready."
            action={newInvoiceButton}
          />
        }
      />
    </>
  )
}
