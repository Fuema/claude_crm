import { PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { PAGE_SIZE_OPTIONS } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import {
  ActivityPanel,
  type HistoryState,
} from '@/features/activities/components/activity-panel'
import type { ActivityScope } from '@/features/activities/types/activity'
import { DEFAULT_PAGE_SIZE } from '@/features/activities/types/activity-search'
import type { LookupOption } from '@/types/lookup-option'

interface ActivitiesSectionProps {
  /** The customer's page (customerId) or a deal's page (customerId + dealId). */
  scope: ActivityScope
  customer: LookupOption
  /** An archived customer's activities are read-only (rule 25). */
  isReadOnly: boolean
}

/** The Activities section on a customer's or deal's page. */
export function ActivitiesSection({
  scope,
  customer,
  isReadOnly,
}: ActivitiesSectionProps) {
  const headingId = useId()
  // Paging here stays on the page; only the Activities page keeps it in the URL.
  const [history, setHistory] = useState<HistoryState>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h2 id={headingId} className="mb-4 text-lg font-semibold">
        Activities
      </h2>
      <ActivityPanel
        scope={scope}
        customer={customer}
        isReadOnly={isReadOnly}
        history={history}
        headingLevel="h3"
        onHistoryChange={({ page, pageSize }) =>
          setHistory((previous) => ({
            ...previous,
            page,
            pageSize:
              PAGE_SIZE_OPTIONS.find((size) => size === pageSize) ??
              DEFAULT_PAGE_SIZE,
          }))
        }
        renderLogButton={(open) => (
          <Button onClick={open}>
            <PlusIcon aria-hidden="true" />
            Log activity
          </Button>
        )}
      />
    </section>
  )
}
