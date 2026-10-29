import { createEmailSender, parseAddress } from '@/server/email'

const EMAIL = {
  to: 'ada@example.test',
  subject: 'Hello',
  text: 'Hi',
  html: '<p>Hi</p>',
}

const MAILPIT = {
  EMAIL_TRANSPORT: 'mailpit',
  EMAIL_FROM: 'CRM <crm@example.test>',
  MAILPIT_URL: 'http://localhost:8025',
} as const

function fetchAnswering(status: number) {
  return vi.fn<typeof fetch>(async () => new Response(null, { status }))
}

describe('createEmailSender', () => {
  it('posts to the Mailpit send API locally', async () => {
    const fetchFn = fetchAnswering(200)
    await createEmailSender(MAILPIT, fetchFn)(EMAIL)

    const [url, init] = fetchFn.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:8025/api/v1/send')
    expect(JSON.parse(String(init?.body))).toEqual({
      From: { Email: 'crm@example.test', Name: 'CRM' },
      To: [{ Email: 'ada@example.test' }],
      Subject: 'Hello',
      Text: 'Hi',
      HTML: '<p>Hi</p>',
    })
  })

  it('posts to Resend with the API key in production', async () => {
    const fetchFn = fetchAnswering(200)
    await createEmailSender(
      {
        EMAIL_TRANSPORT: 'resend',
        EMAIL_FROM: 'CRM <crm@example.test>',
        RESEND_API_KEY: 're_test',
      },
      fetchFn,
    )(EMAIL)

    const [url, init] = fetchFn.mock.calls[0] ?? []
    expect(url).toBe('https://api.resend.com/emails')
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      'Bearer re_test',
    )
    expect(JSON.parse(String(init?.body))).toMatchObject({
      from: 'CRM <crm@example.test>',
      to: ['ada@example.test'],
    })
  })

  it('fails when the transport rejects the email', async () => {
    await expect(
      createEmailSender(MAILPIT, fetchAnswering(422))(EMAIL),
    ).rejects.toThrow('Email transport mailpit answered 422')
  })
})

describe('parseAddress', () => {
  it('splits a display name from the address', () => {
    expect(parseAddress('CRM Team <crm@example.test>')).toEqual({
      name: 'CRM Team',
      email: 'crm@example.test',
    })
  })

  it('accepts a bare address', () => {
    expect(parseAddress('crm@example.test')).toEqual({
      name: '',
      email: 'crm@example.test',
    })
  })
})
