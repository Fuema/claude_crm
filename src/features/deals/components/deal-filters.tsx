import { useId } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DealCustomerFilter } from '@/features/deals/components/deal-customer-filter'
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type DealStage,
  dealStageSchema,
} from '@/features/deals/types/deal'

// Radix Select items cannot have an empty value.
const ALL = 'all'

interface DealFiltersProps {
  stage?: DealStage
  customerId?: string
  onStageChange: (stage: DealStage | undefined) => void
  onCustomerChange: (customerId: string | undefined) => void
}

export function DealFilters({
  stage,
  customerId,
  onStageChange,
  onCustomerChange,
}: DealFiltersProps) {
  const stageId = useId()

  function handleStageChange(value: string) {
    const parsed = dealStageSchema.safeParse(value)
    onStageChange(parsed.success ? parsed.data : undefined)
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={stageId}>Stage</Label>
        <Select value={stage ?? ALL} onValueChange={handleStageChange}>
          <SelectTrigger id={stageId} className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stages</SelectItem>
            {DEAL_STAGES.map((value) => (
              <SelectItem key={value} value={value}>
                {DEAL_STAGE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DealCustomerFilter customerId={customerId} onChange={onCustomerChange} />
    </>
  )
}
