import type { Email } from '@/server/email'

/** Workspace and person names are user input: escape them in HTML. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function layout(
  paragraphs: string[],
  action: { label: string; url: string },
): string {
  const body = paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')
  return `${body}<p><a href="${escapeHtml(action.url)}">${escapeHtml(action.label)}</a></p>`
}

export function verifyEmail(to: string, url: string): Email {
  return {
    to,
    subject: 'Verify your email for CRM',
    text: [
      'Verify your email to finish signing up:',
      url,
      'If you did not sign up, ignore this email.',
    ].join('\n\n'),
    html: layout(
      [
        'Verify your email to finish signing up.',
        'If you did not sign up, ignore this email.',
      ],
      { label: 'Verify email', url },
    ),
  }
}

export function resetPassword(to: string, url: string): Email {
  return {
    to,
    subject: 'Reset your CRM password',
    text: [
      'Reset your password with this link (valid for 1 hour):',
      url,
      'If you did not ask for this, ignore this email.',
    ].join('\n\n'),
    html: layout(
      [
        'Reset your password with the link below. It is valid for 1 hour.',
        'If you did not ask for this, ignore this email.',
      ],
      { label: 'Reset password', url },
    ),
  }
}

/** Sent instead of a second account (rule 16), so sign-up reveals nothing. */
export function existingAccountNotice(to: string, signInUrl: string): Email {
  return {
    to,
    subject: 'Someone tried to sign up with your email',
    text: [
      'Someone tried to create a CRM account with this email, which already has one.',
      'If it was you, sign in, or reset your password from the sign-in page:',
      signInUrl,
      'If it was not you, ignore this email.',
    ].join('\n\n'),
    html: layout(
      [
        'Someone tried to create a CRM account with this email, which already has one.',
        'If it was you, sign in, or reset your password from the sign-in page. If it was not you, ignore this email.',
      ],
      { label: 'Sign in', url: signInUrl },
    ),
  }
}

export function workspaceInvitation(
  to: string,
  details: { inviterName: string; workspaceName: string; url: string },
): Email {
  const { inviterName, workspaceName, url } = details
  return {
    to,
    subject: `${inviterName} invited you to ${workspaceName} on CRM`,
    text: [
      `${inviterName} invited you to join the workspace ${workspaceName}.`,
      'Accept the invitation (valid for 48 hours):',
      url,
    ].join('\n\n'),
    html: layout(
      [
        `${escapeHtml(inviterName)} invited you to join the workspace <strong>${escapeHtml(workspaceName)}</strong>.`,
        'The invitation is valid for 48 hours.',
      ],
      { label: 'Accept invitation', url },
    ),
  }
}
