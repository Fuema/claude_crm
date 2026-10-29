import {
  resetPasswordSchema,
  signUpSchema,
} from '@/features/auth/types/auth-schemas'

const VALID = {
  name: 'Ada Lovelace',
  email: 'ada@example.test',
  password: 'correct horse',
  workspaceName: 'Analytical Engines',
}

function fieldErrors(result: ReturnType<typeof signUpSchema.safeParse>) {
  return result.success ? {} : result.error.flatten().fieldErrors
}

describe('signUpSchema', () => {
  it('accepts a complete sign-up', () => {
    expect(signUpSchema.safeParse(VALID).success).toBe(true)
  })

  it('requires a workspace name for a normal sign-up', () => {
    const result = signUpSchema.safeParse({ ...VALID, workspaceName: ' ' })
    expect(fieldErrors(result)).toEqual({
      workspaceName: ['Workspace name is required'],
    })
  })

  it('needs no workspace name when signing up from an invitation', () => {
    const result = signUpSchema.safeParse({
      ...VALID,
      workspaceName: undefined,
      invitationId: 'inv_1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = signUpSchema.safeParse({ ...VALID, password: 'short' })
    expect(fieldErrors(result)).toEqual({
      password: ['Use at least 8 characters'],
    })
  })

  it('trims the email and checks its format', () => {
    expect(
      signUpSchema.safeParse({ ...VALID, email: '  ada@example.test ' }).data
        ?.email,
    ).toBe('ada@example.test')
    expect(
      fieldErrors(signUpSchema.safeParse({ ...VALID, email: 'ada' })),
    ).toEqual({ email: ['Enter a valid email'] })
  })
})

describe('resetPasswordSchema', () => {
  it('requires both passwords to match', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'correct horse',
      confirmPassword: 'correct hose',
    })
    expect(result.success ? {} : result.error.flatten().fieldErrors).toEqual({
      confirmPassword: ['The passwords do not match'],
    })
  })
})
