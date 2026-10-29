import AxeBuilder from '@axe-core/playwright'
import {
  type APIRequestContext,
  test as base,
  expect,
  type Page,
} from '@playwright/test'

const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025'

/**
 * Every test gets its own client IP, so the per-IP auth rate limit (rule 23)
 * does not count other tests' requests. Locally there is no CF-Connecting-IP,
 * so the app falls back to X-Forwarded-For.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await useOwnClientIp(page)
    await use(page)
  },
})

/** Gives a page (e.g. a second user's) its own client IP; see `test`. */
export async function useOwnClientIp(page: Page): Promise<void> {
  const octet = () => Math.floor(Math.random() * 254) + 1
  await page.setExtraHTTPHeaders({
    'x-forwarded-for': `10.${octet()}.${octet()}.${octet()}`,
  })
}

export { expect }

/**
 * Opens a URL with a full page load and waits until React has hydrated it, so
 * typing is not reset and clicks are not lost (the HMR socket is ignored).
 */
export async function open(page: Page, url: string): Promise<void> {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
}

/**
 * Follows a link in the main navigation. On phones the sidebar is a
 * slide-out panel, so it is opened first.
 */
export async function goToNav(page: Page, name: string): Promise<void> {
  const link = page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name })
  if (!(await link.isVisible())) {
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click()
  }
  await link.click()
}

export function uniqueEmail(label: string): string {
  return `${label}-${crypto.randomUUID().slice(0, 8)}@example.test`
}

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
}

interface MailpitSearch {
  messages: Array<{ ID: string; Subject: string }>
}

/**
 * The first link in the newest email to `to` whose subject contains
 * `subject`. Waits up to 10 s for it to arrive.
 */
export async function linkFromEmail(
  request: APIRequestContext,
  to: string,
  subject: string,
): Promise<string> {
  let link: string | undefined
  await expect
    .poll(
      async () => {
        const search = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${to}"` },
        })
        const { messages } = (await search.json()) as MailpitSearch
        const message = messages.find((m) => m.Subject.includes(subject))
        if (!message) {
          return undefined
        }
        const detail = await request.get(
          `${MAILPIT_URL}/api/v1/message/${message.ID}`,
        )
        const { Text } = (await detail.json()) as { Text: string }
        link = /https?:\/\/\S+/.exec(Text)?.[0]
        return link
      },
      { timeout: 10_000, message: `email "${subject}" to ${to}` },
    )
    .toBeTruthy()
  if (!link) {
    throw new Error(`No link in the email "${subject}" to ${to}`)
  }
  return link
}

export const PASSWORD = 'correct horse battery'

/**
 * Signs up through the UI and opens the verification link, which signs the
 * user in. Ends on the app's home page.
 */
export async function signUpAndVerify(
  page: Page,
  options: { name: string; email: string; workspaceName: string },
): Promise<void> {
  await open(page, '/sign-up')
  await page.getByLabel('Your name').fill(options.name)
  await page.getByLabel('Email').fill(options.email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByLabel('Workspace name').fill(options.workspaceName)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible()

  await open(
    page,
    await linkFromEmail(page.request, options.email, 'Verify your email'),
  )
  await expect(
    page.getByRole('heading', { name: `Welcome, ${options.name}` }),
  ).toBeVisible()
}
