import {
  expect,
  expectNoAxeViolations,
  goToNav,
  linkFromEmail,
  open,
  PASSWORD,
  signUpAndVerify,
  test,
  uniqueEmail,
  useOwnClientIp,
} from '@/tests/e2e/fixtures'

test('critical flow 2: invite a member who signs up from the email', async ({
  page,
  browser,
}) => {
  const ownerEmail = uniqueEmail('olga')
  const inviteeEmail = uniqueEmail('ivan')
  await signUpAndVerify(page, {
    name: 'Olga Owner',
    email: ownerEmail,
    workspaceName: 'Invite Co',
  })

  await goToNav(page, 'Members')
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible()
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'Invite member' }).click()
  await page.getByLabel('Email').fill(inviteeEmail)
  await page.getByRole('button', { name: 'Send invitation' }).click()
  await expect(
    page.getByText(`Invitation sent to ${inviteeEmail}`),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Pending invitations' }),
  ).toContainText(inviteeEmail)

  // The invited person, in their own browser session.
  const inviteeContext = await browser.newContext()
  const invitee = await inviteeContext.newPage()
  await useOwnClientIp(invitee)
  await open(
    invitee,
    await linkFromEmail(
      invitee.request,
      inviteeEmail,
      'invited you to Invite Co',
    ),
  )
  await expect(
    invitee.getByRole('heading', { name: 'You have been invited' }),
  ).toBeVisible()
  await expectNoAxeViolations(invitee)
  await invitee.getByRole('link', { name: 'Create an account' }).click()
  await expect(invitee.getByLabel('Workspace name')).toHaveCount(0)
  await invitee.getByLabel('Your name').fill('Ivan Invitee')
  await invitee.getByLabel('Email').fill(inviteeEmail)
  await invitee.getByLabel('Password').fill(PASSWORD)
  await invitee.getByRole('button', { name: 'Create account' }).click()
  await expect(
    invitee.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible()

  // The verification link signs Ivan in and returns to the invitation.
  await open(
    invitee,
    await linkFromEmail(invitee.request, inviteeEmail, 'Verify your email'),
  )
  await expect(
    invitee.getByRole('heading', { name: 'Join Invite Co' }),
  ).toBeVisible()
  await expectNoAxeViolations(invitee)
  await invitee.getByRole('button', { name: 'Accept invitation' }).click()
  await expect(
    invitee.getByRole('button', { name: /Workspace: Invite Co/ }),
  ).toBeVisible()

  await goToNav(invitee, 'Members')
  const members = invitee.getByRole('table', { name: 'Members' })
  await expect(members).toContainText('Olga Owner')
  await expect(members).toContainText('Ivan Invitee')
  await inviteeContext.close()
})

test('a user switches between workspaces', async ({ page }) => {
  await signUpAndVerify(page, {
    name: 'Sven Switcher',
    email: uniqueEmail('sven'),
    workspaceName: 'First Co',
  })
  await page.getByRole('button', { name: /Workspace: First Co/ }).click()
  await page.getByRole('menuitem', { name: 'Create workspace' }).click()
  await page.getByLabel('Workspace name').fill('Second Co')
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await expect(
    page.getByRole('button', { name: /Workspace: Second Co/ }),
  ).toBeVisible()

  await page.getByRole('button', { name: /Workspace: Second Co/ }).click()
  await page.getByRole('menuitem', { name: 'First Co' }).click()
  await expect(
    page.getByRole('button', { name: /Workspace: First Co/ }),
  ).toBeVisible()
  await expect(page.getByText('You are working in First Co.')).toBeVisible()
})
