import {
  createCustomer,
  expect,
  expectNoAxeViolations,
  signUpAndVerify,
  test,
  uniqueEmail,
} from '@/tests/e2e/fixtures'

test('critical flow 6: add a contact to a customer (with validation errors), edit, and delete it', async ({
  page,
}) => {
  await signUpAndVerify(page, {
    name: 'Carl Contact',
    email: uniqueEmail('carl'),
    workspaceName: 'Contact Co',
  })
  await createCustomer(page, 'Acme Corporation')
  await expectNoAxeViolations(page)

  await page.getByRole('button', { name: 'Add contact' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Add contact' })
  await dialog.getByLabel('Email (optional)').fill('jane')
  await dialog.getByRole('button', { name: 'Add contact' }).click()
  await expect(dialog.getByText('Enter a first name')).toBeVisible()
  await expect(dialog.getByText('Enter a valid email')).toBeVisible()
  await expectNoAxeViolations(page)

  await dialog.getByLabel('First name').fill('Jane')
  await dialog.getByLabel('Last name').fill('Doe')
  await dialog.getByLabel('Job title (optional)').fill('Buyer')
  await dialog.getByLabel('Email (optional)').fill('jane.doe@example.com')
  await dialog.getByRole('button', { name: 'Add contact' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Contact added: Jane Doe')).toBeVisible()

  const contacts = page.getByRole('table', { name: 'Contacts' })
  await expect(contacts.getByRole('row', { name: /Jane Doe/ })).toContainText(
    'Buyer',
  )

  await contacts.getByRole('button', { name: 'Actions for Jane Doe' }).click()
  await page.getByRole('menuitem', { name: 'Edit contact' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit contact' })
  await edit.getByLabel('Job title (optional)').fill('Head of Purchasing')
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await expect(edit).toBeHidden()
  await expect(contacts.getByRole('row', { name: /Jane Doe/ })).toContainText(
    'Head of Purchasing',
  )

  await contacts.getByRole('button', { name: 'Actions for Jane Doe' }).click()
  await page.getByRole('menuitem', { name: 'Delete contact' }).click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('Jane Doe')
  await confirm.getByRole('button', { name: 'Delete contact' }).click()
  await expect(page.getByText('Contact deleted: Jane Doe')).toBeVisible()
  await expect(contacts.getByRole('row', { name: /Jane Doe/ })).toHaveCount(0)
})

test('the contacts of an archived customer are read-only (rule 8)', async ({
  page,
}) => {
  await signUpAndVerify(page, {
    name: 'Rita Readonly',
    email: uniqueEmail('rita'),
    workspaceName: 'Readonly Co',
  })
  await createCustomer(page, 'Old Customer')
  await page.getByRole('button', { name: 'Add contact' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Add contact' })
  await dialog.getByLabel('First name').fill('Otto')
  await dialog.getByLabel('Last name').fill('Old')
  await dialog.getByRole('button', { name: 'Add contact' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Contact added: Otto Old')).toBeVisible()

  await page.getByRole('button', { name: 'Archive customer' }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Archive customer' })
    .click()
  await expect(
    page.getByText('Archived. Restore this customer to make changes.'),
  ).toBeVisible()

  const contacts = page.getByRole('table', { name: 'Contacts' })
  await expect(contacts.getByRole('row', { name: /Otto Old/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add contact' })).toHaveCount(0)
  await expect(
    contacts.getByRole('button', { name: /^Actions for/ }),
  ).toHaveCount(0)
  await expectNoAxeViolations(page)
})
