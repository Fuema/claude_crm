import { getRouteApi, Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/page-header'

const authenticatedRoute = getRouteApi('/_authenticated')

/** Placeholder until the first business feature (Customers) is built. */
export function HomePage() {
  const { shell, workspace } = authenticatedRoute.useRouteContext()
  return (
    <>
      <PageHeader
        title={`Welcome, ${shell.user.name}`}
        description={`You are working in ${workspace.name}.`}
      />
      <p>
        Customers, deals, and activities come next. Meanwhile, you can{' '}
        <Link to="/members" className="underline underline-offset-4">
          invite your colleagues
        </Link>
        .
      </p>
    </>
  )
}
