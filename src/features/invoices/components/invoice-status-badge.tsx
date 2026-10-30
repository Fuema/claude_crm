import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleSlashIcon,
  SendIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from '@/features/invoices/types/invoice'

const ICONS = {
  draft: CircleDashedIcon,
  sent: SendIcon,
  paid: CircleCheckIcon,
  void: CircleSlashIcon,
} satisfies Record<InvoiceStatus, unknown>

/** Icon plus text, so the status never depends on color alone. */
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const Icon = ICONS[status]
  return (
    <Badge variant={status === 'paid' ? 'secondary' : 'outline'}>
      <Icon aria-hidden="true" />
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  )
}
