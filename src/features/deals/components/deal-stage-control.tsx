import { useId } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useChangeDealStage } from '@/features/deals/hooks/use-deals'
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type Deal,
  dealStageSchema,
} from '@/features/deals/types/deal'

interface DealStageControlProps {
  deal: Deal
}

/** Moves a deal to any stage as soon as one is picked. */
export function DealStageControl({ deal }: DealStageControlProps) {
  const selectId = useId()
  const changeStage = useChangeDealStage()

  function handleChange(value: string) {
    const stage = dealStageSchema.safeParse(value)
    if (stage.success && stage.data !== deal.stage) {
      changeStage.mutate({ deal, stage: stage.data })
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={selectId}>Stage</Label>
      <Select
        // Show the picked stage while it saves, not the old one.
        value={
          changeStage.isPending
            ? (changeStage.variables?.stage ?? deal.stage)
            : deal.stage
        }
        onValueChange={handleChange}
        disabled={changeStage.isPending}
      >
        <SelectTrigger id={selectId} className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEAL_STAGES.map((stage) => (
            <SelectItem key={stage} value={stage}>
              {DEAL_STAGE_LABELS[stage]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
