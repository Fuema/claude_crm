import { useSyncExternalStore } from 'react'
import { todayIsoDate } from '@/lib/format'

function subscribe(): () => void {
  // The date changes at midnight; a reload or navigation picks it up.
  return () => undefined
}

function getServerSnapshot(): null {
  return null
}

/**
 * Today's local date ("YYYY-MM-DD") in the browser, `null` while rendering on
 * the server and hydrating: the server's date (UTC) can differ from the
 * user's, and rendering it would make React report a hydration mismatch.
 */
export function useTodayIsoDate(): string | null {
  return useSyncExternalStore(subscribe, todayIsoDate, getServerSnapshot)
}
