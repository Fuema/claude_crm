import { z } from 'zod'
import { workspaceNameSchema } from '@/lib/workspace-name'

// Shared by the forms (zodResolver) and the server functions (validateInput).

export const PASSWORD_MIN_LENGTH = 8

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email'))

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128, 'Use at most 128 characters')

/**
 * Sign-up creates a workspace (rule 18), except when the user arrives from an
 * invitation: then `invitationId` is set and no workspace name is asked.
 */
export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(80, 'Use at most 80 characters'),
    email,
    password: newPassword,
    workspaceName: z.string().trim().optional(),
    invitationId: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.invitationId) {
      return
    }
    const result = workspaceNameSchema.safeParse(value.workspaceName ?? '')
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ['workspaceName'] })
      }
    }
  })

export type SignUpValues = z.infer<typeof signUpSchema>

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
})

export type SignInValues = z.infer<typeof signInSchema>

export const forgotPasswordSchema = z.object({ email })

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'The passwords do not match',
    path: ['confirmPassword'],
  })

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
