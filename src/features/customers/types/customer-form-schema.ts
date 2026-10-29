import { z } from 'zod'
import { type Customer, isHttpUrl } from '@/features/customers/types/customer'

export const PHONE_MAX_LENGTH = 30

/**
 * Create and edit form. Rules come from docs/project.md (Sections 4 and 6).
 * Status is not in the form: it changes only by archiving or restoring.
 */
export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name'),
  industry: z.string().trim(),
  website: z
    .string()
    .trim()
    .refine((value) => value === '' || isHttpUrl(value), {
      message: 'Enter a web address starting with http:// or https://',
    }),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || z.email().safeParse(value).success, {
      message: 'Enter a valid email',
    }),
  phone: z
    .string()
    .trim()
    .max(PHONE_MAX_LENGTH, `Use at most ${PHONE_MAX_LENGTH} characters`),
  address: z.string().trim(),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export const EMPTY_CUSTOMER_FORM: CustomerFormValues = {
  name: '',
  industry: '',
  website: '',
  email: '',
  phone: '',
  address: '',
}

/** The form's values for editing an existing customer. */
export function toCustomerFormValues(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    industry: customer.industry ?? '',
    website: customer.website ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    address: customer.address ?? '',
  }
}
