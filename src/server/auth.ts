import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins/organization'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { logger } from '@/lib/logger'
import { accessControl, workspaceRoles } from '@/server/auth-roles'
import { type Db, getDb } from '@/server/db'
import { createEmailSender, type SendEmail } from '@/server/email'
import {
  existingAccountNotice,
  resetPassword,
  verifyEmail,
  workspaceInvitation,
} from '@/server/email-templates'
import { getServerEnv, type ServerEnv } from '@/server/env'

const HOUR_IN_SECONDS = 60 * 60

export interface AuthDependencies {
  db: Db
  env: Pick<ServerEnv, 'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL'>
  sendEmail: SendEmail
}

export function createAuth({ db, env, sendEmail }: AuthDependencies) {
  return betterAuth({
    appName: 'CRM',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(db, { provider: 'postgresql' }),
    // Rate limits are ours (Upstash, shared by all Worker instances);
    // Better Auth's default store is per isolate.
    rateLimit: { enabled: false },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: HOUR_IN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      onExistingUserSignUp: async ({ user }) => {
        await sendOrLog(
          sendEmail,
          existingAccountNotice(user.email, `${env.BETTER_AUTH_URL}/sign-in`),
          'existing account',
        )
      },
      sendResetPassword: async ({ user, url }) => {
        // The answer to the request never says whether the account exists,
        // so a failed send is logged, not shown.
        await sendOrLog(sendEmail, resetPassword(user.email, url), 'reset')
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        // The user can ask for a new link from the sign-in page.
        await sendOrLog(sendEmail, verifyEmail(user.email, url), 'verification')
      },
    },
    databaseHooks: {
      session: {
        create: {
          // A new session starts in the user's oldest workspace (rule 20).
          before: async (session) => {
            const membership = await db.member.findFirst({
              where: { userId: session.userId },
              orderBy: { createdAt: 'asc' },
              select: { organizationId: true },
            })
            return {
              data: {
                ...session,
                activeOrganizationId: membership?.organizationId ?? null,
              },
            }
          },
        },
      },
    },
    plugins: [
      organization({
        ac: accessControl,
        roles: workspaceRoles,
        invitationExpiresIn: 48 * HOUR_IN_SECONDS,
        sendInvitationEmail: async ({ id, email, organization, inviter }) => {
          // The inviter sees a failure and can try again, so let it throw.
          await sendEmail(
            workspaceInvitation(email, {
              inviterName: inviter.user.name,
              workspaceName: organization.name,
              url: `${env.BETTER_AUTH_URL}/accept-invitation/${id}`,
            }),
          )
        },
      }),
      // Must stay last: lets server functions set Better Auth's cookies.
      tanstackStartCookies(),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>

/**
 * Better Auth for one request (Workers must not share a db connection). Pass
 * the request's db so Better Auth and the app use the same client.
 */
export function getAuth(db: Db = getDb()): Auth {
  const env = getServerEnv()
  return createAuth({ db, env, sendEmail: createEmailSender(env) })
}

async function sendOrLog(
  sendEmail: SendEmail,
  email: Parameters<SendEmail>[0],
  kind: string,
): Promise<void> {
  try {
    await sendEmail(email)
  } catch (error) {
    logger.error(`Could not send the ${kind} email`, { error })
  }
}
