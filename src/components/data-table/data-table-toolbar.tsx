import { SearchIcon } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import type { DataTableSearch } from '@/components/data-table/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const SEARCH_DELAY_MS = 300

interface DataTableToolbarProps {
  search?: DataTableSearch
  /** Feature-specific filters, e.g. a department select. */
  children?: ReactNode
}

export function DataTableToolbar({ search, children }: DataTableToolbarProps) {
  if (!search && !children) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {search && <SearchBox search={search} />}
      {children}
    </div>
  )
}

function SearchBox({ search }: { search: DataTableSearch }) {
  const { value, onChange, label = 'Search' } = search
  const inputId = useId()
  const [input, setInput] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  // Reports whose echo has not come back in `value` yet (e.g. while the page
  // updates the URL). Their echoes are not outside changes.
  const [awaitingEcho, setAwaitingEcho] = useState<string[]>([])
  const [outsideChanges, setOutsideChanges] = useState(0)
  const timerRef = useRef<number | undefined>(undefined)
  // Latest render's view, for the timer; written only in an effect.
  const latestRef = useRef({ value, awaitingEcho })

  if (value !== lastValue) {
    setLastValue(value)
    const echoIndex = awaitingEcho.indexOf(value)
    if (echoIndex >= 0) {
      // Our own report came back: keep what the user has typed since. Older
      // reports were superseded by this one.
      setAwaitingEcho(awaitingEcho.slice(echoIndex + 1))
    } else {
      // An outside change (e.g. the page reset its filters) wins.
      setAwaitingEcho([])
      setInput(value)
      setOutsideChanges((count) => count + 1)
    }
  }

  useEffect(() => {
    latestRef.current = { value, awaitingEcho }
  })

  // After an outside change, cancel a pending report so it cannot undo it.
  useEffect(() => {
    if (outsideChanges > 0) {
      window.clearTimeout(timerRef.current)
    }
  }, [outsideChanges])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  function handleChange(next: string) {
    setInput(next)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const trimmed = next.trim()
      // Compare with what the page will hold once every echo has arrived,
      // not with the value captured when the user typed.
      const latest = latestRef.current
      const expected = latest.awaitingEcho.at(-1) ?? latest.value
      if (trimmed !== expected.trim()) {
        const nextAwaiting = [...latest.awaitingEcho, trimmed]
        latestRef.current = { ...latest, awaitingEcho: nextAwaiting }
        setAwaitingEcho(nextAwaiting)
        onChange(trimmed)
      }
    }, SEARCH_DELAY_MS)
  }

  return (
    <div className="flex w-full flex-col gap-1.5 sm:max-w-xs">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={inputId}
          type="search"
          value={input}
          onChange={(event) => handleChange(event.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  )
}
