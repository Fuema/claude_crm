import type { Locator, Page } from '@playwright/test'
import {
  createCustomer,
  expect,
  expectNoAxeViolations,
  goToNav,
  open,
  signUpAndVerify,
  test,
  uniqueEmail,
} from '@/tests/e2e/fixtures'

async function pick(
  page: Page,
  scope: Locator | Page,
  label: string,
  option: string,
) {
  await scope.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

async function addDeal(
  page: Page,
  deal: { title: string; customer: string; value: string; currency?: string },
) {
  if (!new URL(page.url()).pathname.endsWith('/deals')) {
    await open(page, '/deals')
  }
  await page.getByRole('button', { name: 'Add deal' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Add deal' })
  await dialog.getByLabel('Title').fill(deal.title)
  await pick(page, dialog, 'Customer', deal.customer)
  await dialog.getByLabel('Value').fill(deal.value)
  if (deal.currency) {
    await pick(page, dialog, 'Currency', deal.currency)
  }
  await dialog.getByRole('button', { name: 'Add deal' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(`Deal added: ${deal.title}`)).toBeVisible()
}

function column(page: Page, stage: string) {
  return page.getByRole('region', { name: stage })
}

async function moveOnBoard(
  page: Page,
  from: string,
  title: string,
  to: string,
) {
  await column(page, from)
    .getByRole('article', { name: title })
    .getByRole('button', { name: 'Move to…' })
    .click()
  await page.getByRole('menuitem', { name: to, exact: true }).click()
  await expect(page.getByText(`${title} moved to ${to}`)).toBeVisible()
  await expect(
    column(page, to).getByRole('article', { name: title }),
  ).toBeVisible()
}

test('critical flow 7: create a deal (with validation errors) and move it through its stages', async ({
  page,
}) => {
  await signUpAndVerify(page, {
    name: 'Dana Deal',
    email: uniqueEmail('dana'),
    workspaceName: 'Deal Co',
  })
  await createCustomer(page, 'Acme Corporation')
  await page.getByRole('button', { name: 'Add contact' }).first().click()
  const contactDialog = page.getByRole('dialog', { name: 'Add contact' })
  await contactDialog.getByLabel('First name').fill('Liam')
  await contactDialog.getByLabel('Last name').fill('Carter')
  await contactDialog.getByRole('button', { name: 'Add contact' }).click()
  await expect(page.getByText('Contact added: Liam Carter')).toBeVisible()

  await goToNav(page, 'All deals')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Deals' }),
  ).toBeVisible()
  await expectNoAxeViolations(page)

  await page.getByRole('button', { name: 'Add deal' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Add deal' })
  await dialog.getByRole('button', { name: 'Add deal' }).click()
  await expect(dialog.getByText('Enter a title')).toBeVisible()
  await expect(dialog.getByText('Choose a customer')).toBeVisible()
  await expectNoAxeViolations(page)

  await dialog.getByLabel('Title').fill('Spare parts subscription')
  await pick(page, dialog, 'Customer', 'Acme Corporation')
  await pick(page, dialog, 'Contact (optional)', 'Liam Carter')
  await dialog.getByLabel('Value').fill('2500.50')
  await pick(page, dialog, 'Currency', 'GBP')
  await dialog.getByRole('button', { name: 'Add deal' }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.getByText('Deal added: Spare parts subscription'),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Spare parts subscription' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Spare parts subscription' }),
  ).toBeVisible()
  await expect(page.getByText('£2,500.50')).toBeVisible()
  await expectNoAxeViolations(page)

  for (const stage of ['Qualified', 'Proposal', 'Negotiation', 'Won']) {
    await pick(page, page, 'Stage', stage)
    await expect(
      page.getByText(`Spare parts subscription moved to ${stage}`),
    ).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Stage' })).toHaveText(
      stage,
    )
  }

  // The deal also shows on its customer's page, at its new stage.
  await page.getByRole('link', { name: 'Acme Corporation' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Acme Corporation' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('table', { name: 'Deals' })
      .getByRole('row', { name: /Spare parts subscription/ }),
  ).toContainText('Won')
})

test('the pipeline board moves deals and totals each currency separately', async ({
  page,
}) => {
  await signUpAndVerify(page, {
    name: 'Pia Pipeline',
    email: uniqueEmail('pia'),
    workspaceName: 'Pipeline Co',
  })
  await createCustomer(page, 'Busy Customer')
  await addDeal(page, {
    title: 'Hangar upgrade',
    customer: 'Busy Customer',
    value: '90000',
  })
  await addDeal(page, {
    title: 'Fleet tracking',
    customer: 'Busy Customer',
    value: '61000',
  })
  await addDeal(page, {
    title: 'Spare parts',
    customer: 'Busy Customer',
    value: '4300',
    currency: 'GBP',
  })

  await goToNav(page, 'Pipeline')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Pipeline' }),
  ).toBeVisible()
  // Never converted: one total per currency.
  await expect(column(page, 'Lead')).toContainText(
    '3 deals · €151,000.00 · £4,300.00',
  )
  await expectNoAxeViolations(page)

  await moveOnBoard(page, 'Lead', 'Hangar upgrade', 'Qualified')
  await expect(column(page, 'Lead')).toContainText(
    '2 deals · €61,000.00 · £4,300.00',
  )
  await moveOnBoard(page, 'Qualified', 'Hangar upgrade', 'Lost')
  // A lost deal can be reopened (rule 10).
  await moveOnBoard(page, 'Lost', 'Hangar upgrade', 'Negotiation')
})

test("the board shows an archived customer's deals read-only (rule 12)", async ({
  page,
}) => {
  await signUpAndVerify(page, {
    name: 'Olaf Old',
    email: uniqueEmail('olaf'),
    workspaceName: 'Archive Co',
  })
  await createCustomer(page, 'Old Customer')
  await addDeal(page, {
    title: 'Clinic system',
    customer: 'Old Customer',
    value: '1000',
  })

  await open(page, '/customers')
  await page.getByRole('link', { name: 'Old Customer' }).click()
  await page.getByRole('button', { name: 'Archive customer' }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Archive customer' })
    .click()
  await expect(
    page.getByText('Archived. Restore this customer to make changes.'),
  ).toBeVisible()

  await open(page, '/deals/board')
  const archived = page.getByRole('article', { name: 'Clinic system' })
  await expect(archived).toContainText('Old Customer (archived)')
  await expect(archived.getByRole('button', { name: 'Move to…' })).toHaveCount(
    0,
  )
})
