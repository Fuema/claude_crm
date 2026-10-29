import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import {
  createDataTableColumnHelper,
  DataTable,
  type DataTablePaginationState,
  type DataTableSorting,
} from '@/components/data-table'
import { Button } from '@/components/ui/button'

interface Person {
  id: string
  name: string
  age: number
}

const helper = createDataTableColumnHelper<Person>()
const columns = helper.columns([
  helper.accessor('name', { header: 'Name', enableSorting: true }),
  helper.accessor('age', { header: 'Age' }),
])

const PEOPLE: Person[] = [
  { id: 'p1', name: 'Ada Lovelace', age: 36 },
  { id: 'p2', name: 'Alan Turing', age: 41 },
]

const PAGINATION: DataTablePaginationState = {
  page: 1,
  pageSize: 10,
  total: 42,
}

interface HarnessProps {
  data?: Person[]
  pagination?: DataTablePaginationState
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
  onPaginationChange?: () => void
  onSortingChange?: (sorting: DataTableSorting) => void
  onSearchChange?: (search: string) => void
  /** Delay before a reported search comes back, like a URL update. */
  searchEchoDelayMs?: number
}

/**
 * Holds sorting and search in state, the way a page holds them in the URL.
 * "Reset search" stands in for a page resetting its filters.
 */
function Harness({
  data = PEOPLE,
  pagination = PAGINATION,
  onSortingChange,
  onSearchChange,
  searchEchoDelayMs = 0,
  onPaginationChange = vi.fn(),
  ...rest
}: HarnessProps) {
  const [sorting, setSorting] = useState<DataTableSorting>(null)
  const [search, setSearch] = useState('')

  function handleSearchChange(next: string) {
    onSearchChange?.(next)
    if (searchEchoDelayMs > 0) {
      setTimeout(() => setSearch(next), searchEchoDelayMs)
    } else {
      setSearch(next)
    }
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(person) => person.id}
      caption="People"
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      sorting={sorting}
      onSortingChange={(next) => {
        setSorting(next)
        onSortingChange?.(next)
      }}
      search={onSearchChange && { value: search, onChange: handleSearchChange }}
      toolbar={
        onSearchChange && (
          <Button variant="outline" onClick={() => setSearch('')}>
            Reset search
          </Button>
        )
      }
      {...rest}
    />
  )
}

describe('DataTable', () => {
  it('renders the rows with an accessible name and a summary', () => {
    render(<Harness />)

    const table = screen.getByRole('table', { name: 'People' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('Alan Turing')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–10 of 42')
  })

  it('shows placeholder rows while loading', () => {
    render(<Harness data={[]} isLoading />)

    const table = screen.getByRole('table', { name: 'People' })
    expect(table).toHaveAttribute('aria-busy', 'true')
    expect(within(table).queryByText('Ada Lovelace')).not.toBeInTheDocument()
    // Header row + 10 skeleton rows (page size 10).
    expect(within(table).getAllByRole('row')).toHaveLength(11)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })

  it('shows the error state with a retry button', async () => {
    const user = userEvent.setup()
    const handleRetry = vi.fn()
    render(
      <Harness
        errorMessage="Could not load people. Try again."
        onRetry={handleRetry}
      />,
    )

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load people. Try again.',
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when there are no results', () => {
    render(<Harness data={[]} pagination={{ ...PAGINATION, total: 0 }} />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(
      screen.getByText('Try a different search or filter.'),
    ).toBeInTheDocument()
  })

  it('announces when the results change to none and back', () => {
    const { rerender } = render(<Harness />)
    const status = screen.getByRole('status')

    rerender(<Harness data={[]} pagination={{ ...PAGINATION, total: 0 }} />)
    // The same live region stays mounted, so the change is announced.
    expect(screen.getByRole('status')).toBe(status)
    expect(status).toHaveTextContent('No results')

    rerender(<Harness />)
    expect(status).toHaveTextContent('Showing 1–10 of 42')
  })

  it('offers a way back from a page past the end', async () => {
    const user = userEvent.setup()
    const handlePaginationChange = vi.fn()
    // e.g. the last row of page 4 was deleted, leaving 30 rows (3 pages).
    render(
      <Harness
        data={[]}
        pagination={{ page: 4, pageSize: 10, total: 30 }}
        onPaginationChange={handlePaginationChange}
      />,
    )

    expect(screen.getByText('No rows on this page.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Showing 0 of 30')
    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(handlePaginationChange).toHaveBeenCalledWith({
      page: 3,
      pageSize: 10,
    })
  })

  it('sorts a sortable column ascending, then descending, then off', async () => {
    const user = userEvent.setup()
    const handleSortingChange = vi.fn()
    render(<Harness onSortingChange={handleSortingChange} />)

    const nameHeader = screen.getByRole('columnheader', { name: 'Name' })
    expect(nameHeader).toHaveAttribute('aria-sort', 'none')
    // Columns are not sortable unless they opt in.
    expect(
      screen.getByRole('columnheader', { name: 'Age' }),
    ).not.toHaveAttribute('aria-sort')

    const sortButton = within(nameHeader).getByRole('button', { name: 'Name' })
    await user.click(sortButton)
    expect(handleSortingChange).toHaveBeenLastCalledWith({
      id: 'name',
      desc: false,
    })
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')

    await user.click(sortButton)
    expect(handleSortingChange).toHaveBeenLastCalledWith({
      id: 'name',
      desc: true,
    })
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending')

    await user.click(sortButton)
    expect(handleSortingChange).toHaveBeenLastCalledWith(null)
    expect(nameHeader).toHaveAttribute('aria-sort', 'none')
  })

  it('reports the search once the user stops typing', async () => {
    const user = userEvent.setup()
    const handleSearchChange = vi.fn()
    render(<Harness onSearchChange={handleSearchChange} />)

    await user.type(screen.getByLabelText('Search'), 'ada')
    expect(handleSearchChange).not.toHaveBeenCalled()

    await waitFor(() => expect(handleSearchChange).toHaveBeenCalledWith('ada'))
    expect(handleSearchChange).toHaveBeenCalledTimes(1)
  })

  it('keeps typing that happens before a late echo of the search', async () => {
    const user = userEvent.setup()
    const handleSearchChange = vi.fn()
    // The reported search comes back 200 ms later, like a URL navigation.
    render(
      <Harness onSearchChange={handleSearchChange} searchEchoDelayMs={200} />,
    )
    const input = screen.getByLabelText('Search')

    await user.type(input, 'ada')
    await waitFor(() => expect(handleSearchChange).toHaveBeenCalledWith('ada'))
    // Type again before "ada" comes back.
    await user.type(input, 'b')

    await waitFor(() => expect(handleSearchChange).toHaveBeenCalledWith('adab'))
    expect(input).toHaveValue('adab')
    // Let the "adab" echo arrive too; the input keeps the full text.
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(input).toHaveValue('adab')
    expect(handleSearchChange).toHaveBeenCalledTimes(2)
  })

  it('reports clearing the box before a late echo arrives', async () => {
    const user = userEvent.setup()
    const handleSearchChange = vi.fn()
    render(
      <Harness onSearchChange={handleSearchChange} searchEchoDelayMs={200} />,
    )
    const input = screen.getByLabelText('Search')

    await user.type(input, 'ada')
    await waitFor(() => expect(handleSearchChange).toHaveBeenCalledWith('ada'))
    await user.clear(input)

    await waitFor(() => expect(handleSearchChange).toHaveBeenLastCalledWith(''))
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(input).toHaveValue('')
  })

  it('keeps the latest text when echoes are slower than the debounce', async () => {
    const user = userEvent.setup()
    const handleSearchChange = vi.fn()
    // Each echo takes 500 ms, so "ada" comes back after "adab" was reported.
    render(
      <Harness onSearchChange={handleSearchChange} searchEchoDelayMs={500} />,
    )
    const input = screen.getByLabelText('Search')

    await user.type(input, 'ada')
    await waitFor(() => expect(handleSearchChange).toHaveBeenCalledWith('ada'))
    await user.type(input, 'b')
    await waitFor(() => expect(handleSearchChange).toHaveBeenCalledWith('adab'))

    // Both echoes arrive; neither is mistaken for an outside change.
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(input).toHaveValue('adab')
    expect(handleSearchChange).toHaveBeenCalledTimes(2)
  })

  it('follows an outside reset of the search without undoing it', async () => {
    const user = userEvent.setup()
    const handleSearchChange = vi.fn()
    render(<Harness onSearchChange={handleSearchChange} />)
    const input = screen.getByLabelText('Search')

    await user.type(input, 'ada')
    await waitFor(() => expect(handleSearchChange).toHaveBeenCalledWith('ada'))

    // Typing more, then the page resets before the debounce fires.
    await user.type(input, 'x')
    await user.click(screen.getByRole('button', { name: 'Reset search' }))
    expect(input).toHaveValue('')

    // Wait longer than the 300 ms debounce: the pending "adax" is cancelled.
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(handleSearchChange).toHaveBeenCalledTimes(1)
    expect(input).toHaveValue('')
  })

  it('changes pages and page size', async () => {
    const user = userEvent.setup()
    const handlePaginationChange = vi.fn()
    render(
      <Harness
        pagination={{ page: 2, pageSize: 10, total: 42 }}
        onPaginationChange={handlePaginationChange}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Showing 11–20 of 42')
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(handlePaginationChange).toHaveBeenLastCalledWith({
      page: 3,
      pageSize: 10,
    })
    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(handlePaginationChange).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
    })

    await user.click(screen.getByRole('combobox', { name: 'Rows per page' }))
    await user.click(await screen.findByRole('option', { name: '20' }))
    expect(handlePaginationChange).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
    })
  })

  it('disables previous on the first page and next on the last', () => {
    render(<Harness pagination={{ page: 1, pageSize: 50, total: 42 }} />)

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–42 of 42')
  })

  it('passes meta callbacks to cells', async () => {
    const user = userEvent.setup()
    const onEditRow = vi.fn()
    const columnsWithAction = helper.columns([
      helper.accessor('name', { header: 'Name' }),
      helper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row, table }) => (
          <Button onClick={() => table.options.meta?.onEditRow?.(row.original)}>
            Edit {row.original.name}
          </Button>
        ),
      }),
    ])
    render(
      <DataTable
        columns={columnsWithAction}
        data={PEOPLE}
        getRowId={(person) => person.id}
        caption="People"
        pagination={PAGINATION}
        onPaginationChange={vi.fn()}
        meta={{ onEditRow }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Alan Turing' }))

    expect(onEditRow).toHaveBeenCalledWith(PEOPLE[1])
  })
})
