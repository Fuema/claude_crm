import {
  expect,
  expectNoAxeViolations,
  goToNav,
  open,
  signUpAndVerify,
  test,
  uniqueEmail,
  useOwnClientIp,
} from '@/tests/e2e/fixtures'

test('critical flow 5: create a customer (with validation errors), edit, archive, and restore it', async ({
  page,
}) => {
  await signUpAndVerify(page, {
    name: 'Cora Customer',
    email: uniqueEmail('cora'),
    workspaceName: 'Customer Co',
  })
  await goToNav(page, 'Customers')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Customers' }),
  ).toBeVisible()
  await expectNoAxeViolations(page)

  // Validation in the browser.
  await page.getByRole('button', { name: 'Add customer' }).first().click()
  const addDialog = page.getByRole('dialog', { name: 'Add customer' })
  await addDialog.getByLabel('Website (optional)').fill('zephyr.example.com')
  await addDialog.getByRole('button', { name: 'Add customer' }).click()
  await expect(addDialog.getByText('Enter a name')).toBeVisible()
  await expect(
    addDialog.getByText(
      'Enter a web address starting with http:// or https://',
    ),
  ).toBeVisible()
  await expectNoAxeViolations(page)

  await addDialog.getByLabel('Name').fill('Zephyr Wind Power')
  await addDialog
    .getByLabel('Website (optional)')
    .fill('https://zephyr.example.com')
  await addDialog.getByLabel('Industry (optional)').fill('Energy')
  await addDialog.getByRole('button', { name: 'Add customer' }).click()
  await expect(addDialog).toBeHidden()
  await expect(
    page.getByText('Customer added: Zephyr Wind Power'),
  ).toBeVisible()

  // The server rejects a name already used, ignoring case (rule 6).
  await page.getByRole('button', { name: 'Add customer' }).first().click()
  const secondDialog = page.getByRole('dialog', { name: 'Add customer' })
  await secondDialog.getByLabel('Name').fill('zephyr wind power')
  await secondDialog.getByRole('button', { name: 'Add customer' }).click()
  await expect(
    secondDialog.getByText('A customer with this name already exists.'),
  ).toBeVisible()
  await secondDialog.getByRole('button', { name: 'Cancel' }).click()

  // Edit on the details page.
  await page.getByRole('link', { name: 'Zephyr Wind Power' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Zephyr Wind Power' }),
  ).toBeVisible()
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'Edit customer' }).click()
  const editDialog = page.getByRole('dialog', { name: 'Edit customer' })
  await editDialog.getByLabel('Phone (optional)').fill('+1 555 0199')
  await editDialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(editDialog).toBeHidden()
  await expect(page.getByText('Changes saved')).toBeVisible()
  await expect(page.getByText('+1 555 0199')).toBeVisible()

  // Archive (with confirmation) makes it read-only; restore brings it back.
  await page.getByRole('button', { name: 'Archive customer' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Archive customer?' })
  await expect(confirm).toContainText('Zephyr Wind Power')
  await confirm.getByRole('button', { name: 'Archive customer' }).click()
  await expect(
    page.getByText('Archived. Restore this customer to make changes.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit customer' })).toHaveCount(
    0,
  )

  await page.getByRole('button', { name: 'Restore customer' }).click()
  await expect(
    page.getByText('Customer restored: Zephyr Wind Power'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Edit customer' }),
  ).toBeVisible()
})

test('critical flow 4: a workspace never sees another workspace’s customers', async ({
  page,
  browser,
}) => {
  await signUpAndVerify(page, {
    name: 'Alice A',
    email: uniqueEmail('alice'),
    workspaceName: 'Workspace A',
  })
  await open(page, '/customers')
  await page.getByRole('button', { name: 'Add customer' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Add customer' })
  await dialog.getByLabel('Name').fill('Secret Customer of A')
  await dialog.getByRole('button', { name: 'Add customer' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('link', { name: 'Secret Customer of A' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Secret Customer of A' }),
  ).toBeVisible()
  const customerUrl = page.url()

  const otherContext = await browser.newContext()
  const other = await otherContext.newPage()
  await useOwnClientIp(other)
  await signUpAndVerify(other, {
    name: 'Bob B',
    email: uniqueEmail('bob'),
    workspaceName: 'Workspace B',
  })
  await open(other, '/customers')
  await expect(other.getByText('No active customers')).toBeVisible()
  await expect(other.getByText('Secret Customer of A')).toHaveCount(0)

  // Even the direct link to A's customer shows nothing.
  await open(other, customerUrl)
  await expect(other.getByText('Customer not found')).toBeVisible()
  await expect(other.getByText('Secret Customer of A')).toHaveCount(0)
  await otherContext.close()
})
