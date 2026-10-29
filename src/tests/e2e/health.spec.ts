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
