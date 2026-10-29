import { useId } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CUSTOMER_STATUS_FILTER_LABELS,
  type CustomerStatusFilter,
  customerStatusFilterSchema,
} from '@/features/customers/types/customer-search'

interface CustomerStatusSelectProps {
  value: CustomerStatusFilter
  onChange: (value: CustomerStatusFilter) => void
}

/** The list's status filter: active, archived, or all customers. */
export function CustomerStatusSelect({
  value,
  onChange,
}: CustomerStatusSelectProps) {
  const statusId = useId()

  function handleChange(next: string) {
    const parsed = customerStatusFilterSchema.safeParse(next)
    if (parsed.success) onChange(parsed.data)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={statusId}>Status</Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger id={statusId} className="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {customerStatusFilterSchema.options.map((option) => (
            <SelectItem key={option} value={option}>
              {CUSTOMER_STATUS_FILTER_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
