import { createServerFn } from '@tanstack/react-start'
import {
  createContact,
  deleteContact,
  listCustomerContacts,
  updateContact,
} from '@/features/contacts/server/contact-service'
import {
  contactIdSchema,
  createContactSchema,
  customerContactsSchema,
  updateContactSchema,
} from '@/features/contacts/types/contact-inputs'
import { tenantMiddleware } from '@/server/middleware/auth'
import { validateInput } from '@/server/validate'

export const fetchCustomerContacts = createServerFn({ method: 'GET' })
  .middleware([tenantMiddleware])
  .validator(validateInput(customerContactsSchema))
  .handler(({ data, context }) =>
    listCustomerContacts(context.tenant, data.customerId),
  )

export const createContactFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(createContactSchema))
  .handler(({ data, context }) => {
    const { customerId, ...values } = data
    return createContact(context.tenant, customerId, values)
  })

export const updateContactFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(updateContactSchema))
  .handler(({ data, context }) => {
    const { contactId, ...values } = data
    return updateContact(context.tenant, contactId, values)
  })

export const deleteContactFn = createServerFn({ method: 'POST' })
  .middleware([tenantMiddleware])
  .validator(validateInput(contactIdSchema))
  .handler(({ data, context }) => deleteContact(context.tenant, data.contactId))
