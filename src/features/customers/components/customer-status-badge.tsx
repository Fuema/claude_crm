import { ArchiveIcon, CircleCheckIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  CUSTOMER_STATUS_LABELS,
  type CustomerStatus,
} from '@/features/customers/types/customer'

interface CustomerStatusBadgeProps {
  status: CustomerStatus
}

/** Icon plus text, so the status never depends on color alone. */
export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  const isActive = status === 'active'
  const Icon = isActive ? CircleCheckIcon : ArchiveIcon
  return (
    <Badge variant={isActive ? 'secondary' : 'outline'}>
      <Icon aria-hidden="true" />
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  )
}
