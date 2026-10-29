import type { ServerEnv } from '@/server/env'

export interface Email {
  to: string
  subject: string
  text: string
  html: string
}

export type SendEmail = (email: Email) => Promise<void>

type Fetch = typeof fetch

const RESEND_URL = 'https://api.resend.com/emails'

/**
 * Sends through Resend's REST API in production and Mailpit's send API
 * locally. Both are plain HTTP calls, so no SDK is needed on Workers.
 */
export function createEmailSender(
  env: Pick<
    ServerEnv,
    'EMAIL_TRANSPORT' | 'EMAIL_FROM' | 'MAILPIT_URL' | 'RESEND_API_KEY'
  >,
  fetchFn: Fetch = fetch,
): SendEmail {
  return async (email) => {
    const request =
      env.EMAIL_TRANSPORT === 'resend'
        ? resendRequest(email, env.EMAIL_FROM, env.RESEND_API_KEY ?? '')
        : mailpitRequest(email, env.EMAIL_FROM, env.MAILPIT_URL ?? '')
    const response = await fetchFn(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
    })
    if (!response.ok) {
      throw new Error(
        `Email transport ${env.EMAIL_TRANSPORT} answered ${response.status}`,
      )
    }
  }
}

interface TransportRequest {
  url: string
  headers: Record<string, string>
  body: unknown
}

function resendRequest(
  email: Email,
  from: string,
  apiKey: string,
): TransportRequest {
  return {
    url: RESEND_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    },
  }
}

function mailpitRequest(
  email: Email,
  from: string,
  mailpitUrl: string,
): TransportRequest {
  const sender = parseAddress(from)
  return {
    url: `${mailpitUrl}/api/v1/send`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      From: { Email: sender.email, Name: sender.name },
      To: [{ Email: email.to }],
      Subject: email.subject,
      Text: email.text,
      HTML: email.html,
    },
  }
}

/** Splits `Name <address>` (or a bare address) into its parts. */
export function parseAddress(value: string): { name: string; email: string } {
  const match = /^(.*)<([^>]+)>\s*$/.exec(value)
  if (!match) {
    return { name: '', email: value.trim() }
  }
  return { name: (match[1] ?? '').trim(), email: (match[2] ?? '').trim() }
}
