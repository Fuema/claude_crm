import { useId } from 'react'
import { FormDialog } from '@/components/form-dialog'
import { ContactForm } from '@/features/contacts/components/contact-form'
import {
  useCreateContact,
  useUpdateContact,
} from '@/features/contacts/hooks/use-contacts'
import type { Contact } from '@/features/contacts/types/contact'
import {
  type ContactFormValues,
  EMPTY_CONTACT_FORM,
  toContactFormValues,
} from '@/features/contacts/types/contact-form-schema'

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The customer a new contact is added to. */
  customerId: string
  /** Shown in the description when adding, e.g. "Acme Corporation". */
  customerName: string
  /** The contact to edit; omit to add a new one. */
  contact?: Contact
}

/** Add or edit a contact. Closes itself when the save succeeds. */
export function ContactFormDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  contact,
}: ContactFormDialogProps) {
  const formId = useId()
  const createContact = useCreateContact(customerId)
  const updateContact = useUpdateContact()
  const isEdit = contact !== undefined
  const isPending = createContact.isPending || updateContact.isPending

  async function handleSubmit(values: ContactFormValues) {
    if (isEdit) {
      await updateContact.mutateAsync({ id: contact.id, values })
    } else {
      await createContact.mutateAsync(values)
    }
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit contact' : 'Add contact'}
      description={
        isEdit
          ? `Update the details of ${contact.fullName}.`
          : `Add a person who works at ${customerName}.`
      }
      formId={formId}
      submitLabel={isEdit ? 'Save changes' : 'Add contact'}
      isPending={isPending}
      className="sm:max-w-xl"
    >
      {/* Remount per contact so the form starts from fresh values. */}
      <ContactForm
        key={contact?.id ?? 'new'}
        id={formId}
        defaultValues={
          contact ? toContactFormValues(contact) : EMPTY_CONTACT_FORM
        }
        onSubmit={handleSubmit}
      />
    </FormDialog>
  )
}
