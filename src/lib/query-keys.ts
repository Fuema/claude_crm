/**
 * The prefix of every query key for a workspace's data (docs/data-and-api.md).
 * Invalidating it refreshes everything shown for the workspace; features
 * whose data appears in other features (a customer's name on its deals) do
 * that instead of importing each other's keys.
 */
export function workspaceKey(tenantId: string) {
  return ['tenant', tenantId] as const
}
