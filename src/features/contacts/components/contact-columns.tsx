import { createGenericTableColumnHelper } from '@/components/generic-table'
import { ContactRowActions } from '@/features/contacts/components/contact-row-actions'
import type { Contact } from '@/features/contacts/types/contact'

const helper = createGenericTableColumnHelper<Contact>()

const NOT_PROVIDED = '—'

const byName = new Intl.Collator(undefined, { sensitivity: 'base' })

/**
 * Columns of a customer's contacts. The search box matches the name, job
 * title, email, and phone. The row actions get their callbacks from the
 * GenericTable `meta` prop and are hidden when the customer is read-only.
 */
export const contactColumns = helper.columns([
  helper.accessor('fullName', {
    header: 'Name',
    enableSorting: true,
    sortFn: (rowA, rowB) =>
      byName.compare(
        `${rowA.original.lastName} ${rowA.original.firstName}`,
        `${rowB.original.lastName} ${rowB.original.firstName}`,
      ),
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
  }),
  helper.accessor((contact) => contact.jobTitle ?? '', {
    id: 'jobTitle',
    header: 'Job title',
    enableSorting: true,
    cell: ({ getValue }) => getValue() || NOT_PROVIDED,
  }),
  helper.accessor((contact) => contact.email ?? '', {
    id: 'email',
    header: 'Email',
    enableSorting: true,
    cell: ({ row }) =>
      row.original.email ? (
        <a
          href={`mailto:${row.original.email}`}
          className="break-all underline-offset-4 hover:underline"
        >
          {row.original.email}
        </a>
      ) : (
        NOT_PROVIDED
      ),
  }),
  helper.accessor((contact) => contact.phone ?? '', {
    id: 'phone',
    header: 'Phone',
    cell: ({ getValue }) => getValue() || NOT_PROVIDED,
  }),
  helper.display({
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => {
      const { onEditRow, onDeleteRow } = table.options.meta ?? {}
      if (!onEditRow || !onDeleteRow) return null
      return (
        <ContactRowActions
          contact={row.original}
          onEdit={onEditRow}
          onDelete={onDeleteRow}
        />
      )
    },
  }),
])
