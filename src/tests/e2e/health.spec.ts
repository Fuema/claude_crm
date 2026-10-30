import { expect, test } from '@playwright/test'

test('the health endpoint reports a connected database', async ({
  request,
}) => {
  const response = await request.get('/api/health')
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ database: 'connected' })
})

test('a signed-out visitor is sent to sign in', async ({ page }) => {
  await page.goto('/members')
  await expect(page).toHaveURL(/\/sign-in\?redirect=%2Fmembers/)
  await expect(
    page.getByRole('heading', { name: 'Sign in to CRM' }),
  ).toBeVisible()
})

test('server functions refuse requests from another site (CSRF)', async ({
  page,
}) => {
  // Capture a real server function call made by the sign-up page.
  await page.goto('/sign-up')
  await page.waitForLoadState('networkidle')
  const serverFn = page.waitForRequest((request) =>
    request.url().includes('/_serverFn/'),
  )
  await page.getByLabel('Your name').fill('Csrf Check')
  await page.getByLabel('Email').fill(`csrf-${Date.now()}@example.test`)
  await page.getByLabel('Password').fill('correct horse battery')
  await page.getByLabel('Workspace name').fill('Csrf Co')
  await page.getByRole('button', { name: 'Create account' }).click()
  const original = await serverFn

  const forged = await page.request.fetch(original.url(), {
    method: original.method(),
    headers: {
      ...original.headers(),
      origin: 'https://evil.example',
      'sec-fetch-site': 'cross-site',
    },
    data: original.postData() ?? undefined,
  })
  expect(forged.status()).toBe(403)
})
