import { getRouteApi } from '@tanstack/react-router'

const authenticatedRoute = getRouteApi('/_authenticated')

/**
 * The active workspace's id, for query keys (docs/data-and-api.md). Only for
 * components under the `_authenticated` layout.
 */
export function useWorkspaceId(): string {
  return authenticatedRoute.useRouteContext().workspace.id
}
