import { escapeHtml, workspaceInvitation } from '@/server/email-templates'

describe('email templates', () => {
  it('escapes user-supplied names in the HTML body', () => {
    const email = workspaceInvitation('b@example.test', {
      inviterName: 'Ada',
      workspaceName: '<script>alert(1)</script>',
      url: 'http://localhost:3000/accept-invitation/1',
    })
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;')
  })

  it('escapes every HTML special character', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    )
  })
})
