import type { Page } from '@playwright/test'
import {
  createCustomer,
  expect,
  expectNoAxeViolations,
  goToNav,
  signUpAndVerify,
  test,
  uniqueEmail,
} from '@/tests/e2e/fixtures'

function line(page: Page, number: number) {
  return page.getByRole('group', { name: `Line ${number}` })
}

async function fillLine(
  page: Page,
  number: number,
  values: { description: string; quantity: string; unitPrice: string },
) {
  const group = line(page, number)
  await group.getByLabel('Description').fill(values.description)
  await group.getByLabel('Quantity').fill(values.quantity)
  await group.getByLabel('Unit price').fill(values.unitPrice)
}

/** Starts a draft from the customer page the test is on and saves it. */
async function saveDraftFromCustomerPage(page: Page, description: string) {
  await page.getByRole('link', { name: 'New invoice' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'New invoice' }),
  ).toBeVisible()
  await fillLine(page, 1, { description, quantity: '1', unitPrice: '100' })
  await page.getByRole('button', { name: 'Save draft' }).first().click()
  await expect(page.getByText('Draft invoice saved')).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Draft invoice' }),
  ).toBeVisible()
}

test('critical flow 9: create an invoice with line items, send it, and mark it as paid', async ({
  page,
}) => {
  await signUpAndVerify(page, {
    name: 'Ivy Invoice',
    email: uniqueEmail('ivy'),
    workspaceName: 'Invoice Co',
  })
  await createCustomer(page, 'Acme Corporation')

  // Started from the customer page: the customer is already chosen.
  await page.getByRole('link', { name: 'New invoice' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'New invoice' }),
  ).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Customer' })).toHaveText(
    'Acme Corporation',
  )
  await page.getByRole('button', { name: 'Save draft' }).first().click()
  await expect(page.getByText('Enter a description')).toBeVisible()
  await expectNoAxeViolations(page)

  await fillLine(page, 1, {
    description: 'Sensors',
    quantity: '2',
    unitPrice: '125.50',
  })
  await page.getByRole('button', { name: 'Add line' }).click()
  await fillLine(page, 2, {
    description: 'Installation',
    quantity: '1',
    unitPrice: '300',
  })
  await page.getByLabel('Tax rate (%)').fill('20')
  // The totals preview follows the lines as they are typed.
  await expect(page.getByText('€551.00')).toBeVisible()
  await expect(page.getByText('€110.20')).toBeVisible()
  await expect(page.getByText('€661.20')).toBeVisible()

  await page.getByRole('button', { name: 'Save draft' }).first().click()
  await expect(page.getByText('Draft invoice saved')).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Draft invoice' }),
  ).toBeVisible()
  await expect(
    page.getByRole('table', { name: 'Line items of Draft invoice' }),
  ).toContainText('Installation')
  await expectNoAxeViolations(page)

  // Sending gives it the workspace's next number (rule 29).
  await page.getByRole('button', { name: 'Send invoice' }).click()
  await expect(page.getByText('Invoice sent: INV-0001')).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 1, name: 'INV-0001' }),
  ).toBeVisible()
  // Only drafts can be edited (rule 28).
  await expect(page.getByRole('link', { name: 'Edit draft' })).toBeHidden()

  await page.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(page.getByText('Invoice paid: INV-0001')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Void invoice' })).toBeHidden()
  await expectNoAxeViolations(page)

  await goToNav(page, 'Invoices')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Invoices' }),
  ).toBeVisible()
  const row = page
    .getByRole('table', { name: 'Invoices' })
    .getByRole('row', { name: /INV-0001/ })
  await expect(row).toContainText('Paid')
  await expect(row).toContainText('€661.20')
  await expectNoAxeViolations(page)
})

test("an archived customer's drafts are read-only, but a sent invoice can still be voided (rule 32)", async ({
  page,
}) => {
  await signUpAndVerify(page, {
    name: 'Vic Void',
    email: uniqueEmail('vic'),
    workspaceName: 'Void Co',
  })
  await createCustomer(page, 'Old Customer')
  await saveDraftFromCustomerPage(page, 'Consulting')
  await page.getByRole('button', { name: 'Send invoice' }).click()
  await expect(page.getByText('Invoice sent: INV-0001')).toBeVisible()

  await page.getByRole('link', { name: 'Old Customer' }).click()
  await saveDraftFromCustomerPage(page, 'Follow-up')

  await page.getByRole('link', { name: 'Old Customer' }).click()
  await page.getByRole('button', { name: 'Archive customer' }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Archive customer' })
    .click()
  await expect(page.getByRole('link', { name: 'New invoice' })).toBeHidden()

  // The draft: no edit, send, or void.
  await page.getByRole('link', { name: 'Draft invoice' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Draft invoice' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Edit draft' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Send invoice' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Void invoice' })).toBeHidden()

  // The sent invoice can still be closed.
  await page.getByRole('link', { name: 'Old Customer' }).click()
  await page.getByRole('link', { name: 'INV-0001' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'INV-0001' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeVisible()
  await page.getByRole('button', { name: 'Void invoice' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Void invoice?' })
  await expect(dialog).toContainText('This will void INV-0001.')
  await expectNoAxeViolations(page)
  await dialog.getByRole('button', { name: 'Void invoice' }).click()
  await expect(page.getByText('Invoice voided: INV-0001')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeHidden()
})
