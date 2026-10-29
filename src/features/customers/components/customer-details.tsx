import type { ReactNode } from 'react'
import { CustomerStatusBadge } from '@/features/customers/components/customer-status-badge'
import { type Customer, isHttpUrl } from '@/features/customers/types/customer'

const NOT_PROVIDED = 'Not provided'

interface CustomerDetailsProps {
  customer: Customer
}

export function CustomerDetails({ customer }: CustomerDetailsProps) {
  const { website, email } = customer
  return (
    <dl className="grid gap-x-6 gap-y-4 rounded-lg border p-4 sm:grid-cols-2">
      <DetailItem term="Industry">
        {customer.industry ?? NOT_PROVIDED}
      </DetailItem>
      <DetailItem term="Website">
        {/* Only http(s) becomes a link, so a stored "javascript:" URL cannot run. */}
        {website && isHttpUrl(website) ? (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all underline-offset-4 hover:underline"
          >
            {website}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          (website ?? NOT_PROVIDED)
        )}
      </DetailItem>
      <DetailItem term="Email">
        {email ? (
          <a
            href={`mailto:${email}`}
            className="break-all underline-offset-4 hover:underline"
          >
            {email}
          </a>
        ) : (
          NOT_PROVIDED
        )}
      </DetailItem>
      <DetailItem term="Phone">{customer.phone ?? NOT_PROVIDED}</DetailItem>
      <DetailItem term="Address">{customer.address ?? NOT_PROVIDED}</DetailItem>
      <DetailItem term="Status">
        <CustomerStatusBadge status={customer.status} />
      </DetailItem>
    </dl>
  )
}

interface DetailItemProps {
  term: string
  children: ReactNode
}

function DetailItem({ term, children }: DetailItemProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}
