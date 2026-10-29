import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import {
  createContactFn,
  deleteContactFn,
  fetchCustomerContacts,
  updateContactFn,
} from '@/features/contacts/server/contact-functions'
import type { Contact } from '@/features/contacts/types/contact'
import type { ContactFormValues } from '@/features/contacts/types/contact-form-schema'
import { useWorkspaceId } from '@/hooks/use-workspace-id'
import { isAppError } from '@/lib/app-error'

/** Keys start with the workspace id (docs/data-and-api.md). */
export const contactKeys = {
  all: (tenantId: string) => ['tenant', tenantId, 'contacts'] as const,
  /** Every contact of one customer. */
  byCustomer: (tenantId: string, customerId: string) =>
    [...contactKeys.all(tenantId), 'customer', customerId] as const,
}

/** Every contact of one customer, for the table that searches and sorts in the browser. */
export function useCustomerContacts(customerId: string) {
  const tenantId = useWorkspaceId()
  return useQuery({
    queryKey: contactKeys.byCustomer(tenantId, customerId),
    queryFn: () => fetchCustomerContacts({ data: { customerId } }),
  })
}

function useInvalidateContacts() {
  const queryClient = useQueryClient()
  const tenantId = useWorkspaceId()
  return () =>
    queryClient.invalidateQueries({ queryKey: contactKeys.all(tenantId) })
}

// Create and update toast on success only. Their failures are shown inside
// the open form (see ContactForm). Delete has no form, so it toasts both
// ways.

export function useCreateContact(customerId: string) {
  const create = useServerFn(createContactFn)
  const invalidate = useInvalidateContacts()
  return useMutation({
    mutationFn: (values: ContactFormValues) =>
      create({ data: { ...values, customerId } }),
    onSuccess: async (contact) => {
      toast.success(`Contact added: ${contact.fullName}`)
      await invalidate()
    },
  })
}

export function useUpdateContact() {
  const update = useServerFn(updateContactFn)
  const invalidate = useInvalidateContacts()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ContactFormValues }) =>
      update({ data: { ...values, contactId: id } }),
    onSuccess: async () => {
      toast.success('Changes saved')
      await invalidate()
    },
  })
}

export function useDeleteContact() {
  const remove = useServerFn(deleteContactFn)
  const invalidate = useInvalidateContacts()
  return useMutation({
    mutationFn: (contact: Contact) =>
      remove({ data: { contactId: contact.id } }),
    onSuccess: async (_, contact) => {
      toast.success(`Contact deleted: ${contact.fullName}`)
      await invalidate()
    },
    onError: async (error, contact) => {
      if (isContactGone(error)) {
        toast.error(`${contact.fullName} was already deleted.`)
        await invalidate()
        return
      }
      if (isAppError(error) && error.code === 'CUSTOMER_ARCHIVED') {
        toast.error(error.message)
        return
      }
      toast.error(`Could not delete ${contact.fullName}. Try again.`)
    },
  })
}

/** The contact does not exist (anymore), e.g. someone else deleted it. */
export function isContactGone(error: unknown): boolean {
  return isAppError(error) && error.code === 'NOT_FOUND'
}
