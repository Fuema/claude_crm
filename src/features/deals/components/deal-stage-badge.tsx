import { CircleCheckIcon, CircleDotIcon, CircleXIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DEAL_STAGE_LABELS, type DealStage } from '@/features/deals/types/deal'

interface DealStageBadgeProps {
  stage: DealStage
}

/** Icon plus text, so the stage never depends on color alone. */
export function DealStageBadge({ stage }: DealStageBadgeProps) {
  const Icon =
    stage === 'won'
      ? CircleCheckIcon
      : stage === 'lost'
        ? CircleXIcon
        : CircleDotIcon
  return (
    <Badge variant={stage === 'won' ? 'secondary' : 'outline'}>
      <Icon aria-hidden="true" />
      {DEAL_STAGE_LABELS[stage]}
    </Badge>
  )
}
