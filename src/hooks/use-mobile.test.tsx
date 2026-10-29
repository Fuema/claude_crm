import { renderToString } from 'react-dom/server'
import { useIsMobile } from '@/hooks/use-mobile'

function Probe() {
  return <span>{useIsMobile() ? 'mobile' : 'desktop'}</span>
}

describe('useIsMobile', () => {
  it('renders on the server as desktop, without touching window', () => {
    expect(renderToString(<Probe />)).toContain('desktop')
  })
})
