import { useId } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCustomerOptions } from '@/features/customers'

// Radix Select items cannot have an empty value.
const ALL = 'all'

interface DealCustomerFilterProps {
  customerId?: string
  onChange: (customerId: string | undefined) => void
}

/**
 * Narrows deals to one customer. Offers every customer, archived ones
 * marked, so an archived customer's deals can be found too.
 */
export function DealCustomerFilter({
  customerId,
  onChange,
}: DealCustomerFilterProps) {
  const selectId = useId()
  const customers = useCustomerOptions('all')

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={selectId}>Customer</Label>
      <Select
        value={customerId ?? ALL}
        onValueChange={(value) => onChange(value === ALL ? undefined : value)}
        disabled={customers.data === undefined}
      >
        <SelectTrigger id={selectId} className="w-full sm:w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All customers</SelectItem>
          {customers.data?.map((customer) => (
            <SelectItem key={customer.id} value={customer.id}>
              {customer.isArchived
                ? `${customer.name} (archived)`
                : customer.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {customers.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not load customers. Reload the page to filter by customer.
        </p>
      )}
    </div>
  )
}
