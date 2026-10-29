import { z } from 'zod'
import { contactFormSchema } from '@/features/contacts/types/contact-form-schema'

// Server-function inputs, built from the form schema so the browser and the
// server validate the same rules.

export const customerContactsSchema = z.object({
  customerId: z.string().min(1),
})

export const createContactSchema = contactFormSchema.extend({
  customerId: z.string().min(1),
})

export const updateContactSchema = contactFormSchema.extend({
  contactId: z.string().min(1),
})

export const contactIdSchema = z.object({ contactId: z.string().min(1) })
