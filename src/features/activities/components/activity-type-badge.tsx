import {
  CheckSquareIcon,
  type LucideIcon,
  MailIcon,
  PhoneIcon,
  UsersIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  ACTIVITY_TYPE_LABELS,
  type ActivityType,
} from '@/features/activities/types/activity'

const ICONS: Record<ActivityType, LucideIcon> = {
  call: PhoneIcon,
  meeting: UsersIcon,
  email: MailIcon,
  task: CheckSquareIcon,
}

/** Icon plus text, so the type never depends on the icon alone. */
export function ActivityTypeBadge({ type }: { type: ActivityType }) {
  const Icon = ICONS[type]
  return (
    <Badge variant="outline">
      <Icon aria-hidden="true" />
      {ACTIVITY_TYPE_LABELS[type]}
    </Badge>
  )
}
