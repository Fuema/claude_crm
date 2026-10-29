import { PlusIcon, UsersIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { GenericTable } from '@/components/generic-table'
import { Button } from '@/components/ui/button'
import { contactColumns } from '@/features/contacts/components/contact-columns'
import { ContactFormDialog } from '@/features/contacts/components/contact-form-dialog'
import { DeleteContactDialog } from '@/features/contacts/components/delete-contact-dialog'
import { useCustomerContacts } from '@/features/contacts/hooks/use-contacts'
import type { Contact } from '@/features/contacts/types/contact'
import { isAppError } from '@/lib/app-error'

const NO_CONTACTS: Contact[] = []

interface CustomerContactsProps {
  customerId: string
  customerName: string
  /** True for an archived customer: contacts are shown but cannot change. */
  isReadOnly: boolean
}

/** The Contacts section of a customer's details page. */
export function CustomerContacts({
  customerId,
  customerName,
  isReadOnly,
}: CustomerContactsProps) {
  const headingId = useId()
  const contacts = useCustomerContacts(customerId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | undefined>()
  const [deleting, setDeleting] = useState<Contact | null>(null)

  function openAddDialog() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEditDialog(contact: Contact) {
    setEditing(contact)
    setFormOpen(true)
  }

  const errorMessage =
    contacts.isError && !contacts.data
      ? isAppError(contacts.error)
        ? contacts.error.message
        : 'Could not load contacts.'
      : undefined

  const addButton = isReadOnly ? undefined : (
    <Button onClick={openAddDialog}>
      <PlusIcon aria-hidden="true" />
      Add contact
    </Button>
  )

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          Contacts
        </h2>
        {addButton}
      </div>
      <GenericTable
        columns={contactColumns}
        meta={
          isReadOnly
            ? undefined
            : { onEditRow: openEditDialog, onDeleteRow: setDeleting }
        }
        data={contacts.data ?? NO_CONTACTS}
        getRowId={(contact) => contact.id}
        caption="Contacts"
        searchLabel="Search contacts"
        isLoading={contacts.isPending}
        errorMessage={errorMessage}
        onRetry={() => void contacts.refetch()}
        emptyState={
          <EmptyState
            icon={UsersIcon}
            title="No contacts yet"
            description={
              isReadOnly
                ? `${customerName} has no contacts.`
                : `Add the people you work with at ${customerName}.`
            }
            action={addButton}
          />
        }
      />
      {!isReadOnly && (
        <>
          <ContactFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            customerId={customerId}
            customerName={customerName}
            contact={editing}
          />
          <DeleteContactDialog
            contact={deleting}
            onOpenChange={(open) => !open && setDeleting(null)}
          />
        </>
      )}
    </section>
  )
}
