import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('the server-rendered home page reports a connected database', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'CRM' })).toBeVisible()
  await expect(page.getByText('Database: connected')).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
