import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { useTodayIsoDate } from '@/hooks/use-today'
import { todayIsoDate } from '@/lib/format'

function Probe() {
  return <span>{useTodayIsoDate() ?? 'unknown'}</span>
}

describe('useTodayIsoDate', () => {
  it('renders no date on the server', () => {
    expect(renderToString(<Probe />)).toContain('unknown')
  })

  it('gives the local date in the browser', () => {
    render(<Probe />)
    expect(screen.getByText(todayIsoDate())).toBeInTheDocument()
  })
})
