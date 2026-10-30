import {
  activityFormSchema,
  newActivityFormValues,
} from '@/features/activities/types/activity-form-schema'

function errors(values: unknown) {
  const result = activityFormSchema.safeParse(values)
  return result.success ? {} : result.error.flatten().fieldErrors
}

describe('activityFormSchema', () => {
  const valid = {
    ...newActivityFormValues('2026-10-30', { customerId: 'c1' }),
    subject: 'Intro call',
  }

  it('accepts a complete activity', () => {
    expect(activityFormSchema.safeParse(valid).success).toBe(true)
  })

  it('requires a subject, a date, and a customer', () => {
    expect(
      errors({ ...valid, subject: ' ', date: '', customerId: '' }),
    ).toEqual({
      subject: ['Enter a subject'],
      date: ['Enter a date'],
      customerId: ['Choose a customer'],
    })
  })

  it('limits the subject and notes', () => {
    expect(
      errors({ ...valid, subject: 'x'.repeat(201), notes: 'y'.repeat(5001) }),
    ).toEqual({
      subject: ['Use at most 200 characters'],
      notes: ['Use at most 5000 characters'],
    })
  })
})

describe('newActivityFormValues', () => {
  it('starts as a call today for the given customer and deal', () => {
    expect(
      newActivityFormValues('2026-10-30', { customerId: 'c1', dealId: 'd1' }),
    ).toMatchObject({
      type: 'call',
      date: '2026-10-30',
      customerId: 'c1',
      dealId: 'd1',
    })
  })
})
