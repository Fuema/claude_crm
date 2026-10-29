import { z } from 'zod'
import type { Contact } from '@/features/contacts/types/contact'

export const PHONE_MAX_LENGTH = 30

/** Create and edit form. Rules come from docs/project.md (Sections 4 and 6). */
export const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter a first name'),
  lastName: z.string().trim().min(1, 'Enter a last name'),
  jobTitle: z.string().trim(),
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
})

export type ContactFormValues = z.infer<typeof contactFormSchema>

export const EMPTY_CONTACT_FORM: ContactFormValues = {
  firstName: '',
  lastName: '',
  jobTitle: '',
  email: '',
  phone: '',
}

/** The form's values for editing an existing contact. */
export function toContactFormValues(contact: Contact): ContactFormValues {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    jobTitle: contact.jobTitle ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
  }
}
