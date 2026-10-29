import {
  expect,
  expectNoAxeViolations,
  linkFromEmail,
  open,
  PASSWORD,
  signUpAndVerify,
  test,
  uniqueEmail,
} from '@/tests/e2e/fixtures'

test('critical flow 1: sign up with email verification, sign out, and sign in', async ({
  page,
}) => {
  const email = uniqueEmail('ada')
  await open(page, '/sign-up')
  await expectNoAxeViolations(page)

  await signUpAndVerify(page, {
    name: 'Ada Lovelace',
    email,
    workspaceName: 'Analytical Engines',
  })
  await expect(
    page.getByRole('button', { name: /Workspace: Analytical Engines/ }),
  ).toBeVisible()
  await expectNoAxeViolations(page)

  await page
    .getByRole('button', { name: 'Account menu for Ada Lovelace' })
    .click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(
    page.getByRole('heading', { name: 'Sign in to CRM' }),
  ).toBeVisible()
  await expectNoAxeViolations(page)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByRole('heading', { name: 'Welcome, Ada Lovelace' }),
  ).toBeVisible()
})

test('an unverified user is told to verify and can get a new link', async ({
  page,
}) => {
  const email = uniqueEmail('una')
  await open(page, '/sign-up')
  await page.getByLabel('Your name').fill('Una Verified')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByLabel('Workspace name').fill('Unverified Co')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible()

  await open(page, '/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByText('Verify your email before signing in.'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Send the link again' }).click()
  await expect(page.getByText(`We sent a new link to ${email}.`)).toBeVisible()
})

test('a wrong password shows an error without revealing which part was wrong', async ({
  page,
}) => {
  await open(page, '/sign-in')
  await page.getByLabel('Email').fill(uniqueEmail('nobody'))
  await page.getByLabel('Password').fill('not the password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByText('The email or password is not correct.'),
  ).toBeVisible()
})

test('critical flow 3: reset a forgotten password', async ({ page }) => {
  const email = uniqueEmail('rita')
  await signUpAndVerify(page, {
    name: 'Rita Reset',
    email,
    workspaceName: 'Reset Co',
  })
  await page
    .getByRole('button', { name: 'Account menu for Rita Reset' })
    .click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()

  await page.getByRole('link', { name: 'Forgot your password?' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(
    page.getByText(`If an account exists for ${email}`),
  ).toBeVisible()

  await open(
    page,
    await linkFromEmail(page.request, email, 'Reset your CRM password'),
  )
  await expect(
    page.getByRole('heading', { name: 'Choose a new password' }),
  ).toBeVisible()
  await expectNoAxeViolations(page)
  const newPassword = 'a brand new password'
  await page.getByLabel('New password', { exact: true }).fill(newPassword)
  await page.getByLabel('Repeat the new password').fill(newPassword)
  await page.getByRole('button', { name: 'Set new password' }).click()

  await expect(
    page.getByText('Your password was changed. Sign in with the new one.'),
  ).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(newPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByRole('heading', { name: 'Welcome, Rita Reset' }),
  ).toBeVisible()
})
