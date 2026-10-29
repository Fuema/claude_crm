import type { Auth } from '@/server/auth'

/** A workspace owned by `userId`; used by sign-up, before any session exists. */
export async function createOwnedWorkspace(
  auth: Auth,
  userId: string,
  name: string,
): Promise<{ id: string }> {
  const workspace = await auth.api.createOrganization({
    body: { name, slug: workspaceSlug(name), userId },
  })
  if (!workspace) {
    throw new Error('Better Auth did not return the created workspace')
  }
  return { id: workspace.id }
}

/**
 * Better Auth requires a unique slug. The CRM never shows it, so a readable
 * prefix plus a random suffix is enough.
 */
export function workspaceSlug(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = crypto.randomUUID().slice(0, 8)
  return base ? `${base}-${suffix}` : suffix
}
