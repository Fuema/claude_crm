import type { Contact } from '@/features/contacts/types/contact'
import type { ContactFormValues } from '@/features/contacts/types/contact-form-schema'
import { AppError } from '@/lib/app-error'
import type { TenantScope } from '@/server/tenant-db'

interface ContactRow {
  id: string
  customerId: string
  firstName: string
  lastName: string
  jobTitle: string | null
  email: string | null
  phone: string | null
}

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    customerId: row.customerId,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`,
    jobTitle: row.jobTitle,
    email: row.email,
    phone: row.phone,
  }
}

function toColumns(values: ContactFormValues) {
  const orNull = (value: string) => value.trim() || null
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    jobTitle: orNull(values.jobTitle),
    email: orNull(values.email),
    phone: orNull(values.phone),
  }
}

/** Every contact of a customer, by last name, then first name. */
export async function listCustomerContacts(
  scope: TenantScope,
  customerId: string,
): Promise<Contact[]> {
  await findCustomer(scope, customerId)
  const rows = await scope.db.contact.findMany({
    where: { customerId },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
  })
  return rows.map(toContact)
}

export async function createContact(
  scope: TenantScope,
  customerId: string,
  values: ContactFormValues,
): Promise<Contact> {
  const customer = await findCustomer(scope, customerId)
  if (customer.status === 'archived') {
    throw customerArchived()
  }
  const row = await scope.db.contact.create({
    data: { ...toColumns(values), customerId, tenantId: scope.tenantId },
  })
  return toContact(row)
}

/** Rule 8: only while the contact's customer is active (same statement). */
export async function updateContact(
  scope: TenantScope,
  contactId: string,
  values: ContactFormValues,
): Promise<Contact> {
  const { count } = await scope.db.contact.updateMany({
    where: { id: contactId, customer: { status: 'active' } },
    data: toColumns(values),
  })
  if (count === 0) {
    throw await whyUnchanged(scope, contactId)
  }
  return getContact(scope, contactId)
}

/** Rule 7: permanent, after the UI's confirmation. */
export async function deleteContact(
  scope: TenantScope,
  contactId: string,
): Promise<void> {
  const { count } = await scope.db.contact.deleteMany({
    where: { id: contactId, customer: { status: 'active' } },
  })
  if (count === 0) {
    throw await whyUnchanged(scope, contactId)
  }
}

async function getContact(
  scope: TenantScope,
  contactId: string,
): Promise<Contact> {
  const row = await scope.db.contact.findUnique({ where: { id: contactId } })
  if (!row) {
    throw contactNotFound()
  }
  return toContact(row)
}

/** A change matched nothing: the contact is gone, or its customer archived. */
async function whyUnchanged(
  scope: TenantScope,
  contactId: string,
): Promise<AppError> {
  const contact = await scope.db.contact.findUnique({
    where: { id: contactId },
    select: { id: true },
  })
  return contact ? customerArchived() : contactNotFound()
}

async function findCustomer(scope: TenantScope, customerId: string) {
  const customer = await scope.db.customer.findUnique({
    where: { id: customerId },
    select: { status: true },
  })
  if (!customer) {
    throw new AppError({
      code: 'NOT_FOUND',
      message: 'This customer does not exist.',
    })
  }
  return customer
}

function contactNotFound(): AppError {
  return new AppError({
    code: 'NOT_FOUND',
    message: 'This contact does not exist.',
  })
}

function customerArchived(): AppError {
  return new AppError({
    code: 'CUSTOMER_ARCHIVED',
    message: 'This customer is archived. Restore it to change its contacts.',
  })
}
