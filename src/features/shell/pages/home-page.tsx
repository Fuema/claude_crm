import { getRouteApi, Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'

const authenticatedRoute = getRouteApi('/_authenticated')

/** Placeholder until there is a dashboard. */
export function HomePage() {
  const { shell, workspace } = authenticatedRoute.useRouteContext()
  return (
    <>
      <PageHeader
        title={`Welcome, ${shell.user.name}`}
        description={`You are working in ${workspace.name}.`}
      />
      <p>
        Start with your{' '}
        <Link to="/customers" className="underline underline-offset-4">
          customers
        </Link>
        , or{' '}
        <Link to="/members" className="underline underline-offset-4">
          invite your colleagues
        </Link>
        . Deals and activities come next.
      </p>
    </>
  )
}
