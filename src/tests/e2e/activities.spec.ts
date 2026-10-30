import type { Locator, Page } from '@playwright/test'
import {
  createCustomer,
  expect,
  expectNoAxeViolations,
  goToNav,
  signUpAndVerify,
  test,
  uniqueEmail,
} from '@/tests/e2e/fixtures'

async function pick(page: Page, scope: Locator, label: string, option: string) {
  await scope.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

async function logActivity(
  page: Page,
  activity: { type: string; subject: string; date: string; notes?: string },
) {
  await page.getByRole('button', { name: 'Log activity' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Log activity' })
  await pick(page, dialog, 'Type', activity.type)
  await dialog.getByLabel('Subject').fill(activity.subject)
  await dialog
    .getByLabel(activity.type === 'Task' ? 'Due date' : 'Date')
    .fill(activity.date)
  if (activity.notes) {
    await dialog.getByLabel('Notes (optional)').fill(activity.notes)
  }
  await dialog.getByRole('button', { name: 'Log activity' }).click()
  await expect(dialog).toBeHidden()
  await expect(
    page.getByText(`Activity logged: ${activity.subject}`),
  ).toBeVisible()
}

test('critical flow 8: log an activity and complete a task', async ({
  page,
}) => {
  await signUpAndVerify(page, {
    name: 'Ari Activity',
    email: uniqueEmail('ari'),
    workspaceName: 'Activity Co',
  })
  await createCustomer(page, 'Acme Corporation')

  // Validation first.
  await page.getByRole('button', { name: 'Log activity' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Log activity' })
  await dialog.getByRole('button', { name: 'Log activity' }).click()
  await expect(dialog.getByText('Enter a subject')).toBeVisible()
  await expectNoAxeViolations(page)
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  await logActivity(page, {
    type: 'Call',
    subject: 'Intro call',
    date: '2026-03-02',
    notes: 'Interested in the premium plan.',
  })
  await logActivity(page, {
    type: 'Task',
    subject: 'Send the proposal',
    date: '2020-01-15',
  })

  // The task is open and overdue; the call is in the history.
  const openTasks = page.getByRole('region', { name: 'Open tasks' })
  await expect(openTasks).toContainText('Send the proposal')
  await expect(openTasks).toContainText('Overdue')
  const history = page.getByRole('table', { name: 'Activity history' })
  await expect(history).toContainText('Intro call')
  await expect(history).toContainText('Interested in the premium plan.')
  await expectNoAxeViolations(page)

  // Completing the task moves it to the history, marked done (rule 27).
  await openTasks
    .getByRole('checkbox', { name: 'Mark Send the proposal as done' })
    .click()
  await expect(page.getByText('Task done: Send the proposal')).toBeVisible()
  await expect(openTasks).toContainText('No open tasks.')
  await expect(
    history.getByRole('row', { name: /Send the proposal/ }),
  ).toContainText('Done')

  // It can be reopened from the history.
  await history
    .getByRole('button', { name: 'Actions for Send the proposal' })
    .click()
  await page.getByRole('menuitem', { name: 'Mark as not done' }).click()
  await expect(openTasks).toContainText('Send the proposal')

  // The Activities page shows the same, across customers.
  await goToNav(page, 'Activities')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Activities' }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: 'Open tasks' })).toContainText(
    'Acme Corporation',
  )
  await expectNoAxeViolations(page)
})

test('an archived customer’s activities are read-only (rule 25), and deleting asks first (rule 26)', async ({
  page,
}) => {
  await signUpAndVerify(page, {
    name: 'Rex Readonly',
    email: uniqueEmail('rex'),
    workspaceName: 'Readonly Activity Co',
  })
  await createCustomer(page, 'Old Customer')
  await logActivity(page, {
    type: 'Meeting',
    subject: 'Kickoff',
    date: '2026-02-02',
  })
  await logActivity(page, {
    type: 'Email',
    subject: 'Follow-up',
    date: '2026-02-03',
  })

  const history = page.getByRole('table', { name: 'Activity history' })
  await history.getByRole('button', { name: 'Actions for Follow-up' }).click()
  await page.getByRole('menuitem', { name: 'Delete activity' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Delete activity?' })
  await expect(confirm).toContainText('Follow-up')
  await confirm.getByRole('button', { name: 'Delete activity' }).click()
  await expect(page.getByText('Activity deleted: Follow-up')).toBeVisible()
  await expect(history.getByRole('row', { name: /Follow-up/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Archive customer' }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Archive customer' })
    .click()
  await expect(
    page.getByText('Archived. Restore this customer to make changes.'),
  ).toBeVisible()
  await expect(history.getByRole('row', { name: /Kickoff/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log activity' })).toHaveCount(
    0,
  )
  await expect(
    history.getByRole('button', { name: /^Actions for/ }),
  ).toHaveCount(0)
})
