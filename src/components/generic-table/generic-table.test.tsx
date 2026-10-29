import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ComponentProps, useState } from 'react'
import {
  createGenericTableColumnHelper,
  DEFAULT_GENERIC_TABLE_STATE,
  GenericTable,
  type GenericTableSelection,
  type GenericTableState,
} from '@/components/generic-table'
import { Button } from '@/components/ui/button'

interface Person {
  id: string
  name: string
  age: number
}

const helper = createGenericTableColumnHelper<Person>()
const columns = helper.columns([
  helper.accessor('name', { header: 'Name', enableSorting: true }),
  helper.accessor('age', { header: 'Age', enableSorting: true }),
])

// 25 people: "Person 01" (age 21) … "Person 25" (age 45).
const PEOPLE: Person[] = Array.from({ length: 25 }, (_, index) => ({
  id: `p${index + 1}`,
  name: `Person ${String(index + 1).padStart(2, '0')}`,
  age: 21 + index,
}))

const getRowLabel = (person: Person) => person.name

type Props = ComponentProps<typeof GenericTable<Person>>

function table(props: Partial<Props> = {}) {
  return (
    <GenericTable
      columns={columns}
      data={PEOPLE}
      getRowId={(person) => person.id}
      caption="People"
      searchLabel="Search people"
      {...props}
    />
  )
}

function renderTable(props: Partial<Props> = {}) {
  const user = userEvent.setup()
  const utils = render(table(props))
  return {
    user,
    rerender: (next: Partial<Props>) => utils.rerender(table(next)),
  }
}

function bodyRows() {
  const element = screen.getByRole('table', { name: 'People' })
  return within(element).getAllByRole('row').slice(1)
}

function names() {
  return bodyRows().map(
    (row) =>
      within(row)
        .getAllByRole('cell')
        .find((cell) => cell.textContent?.startsWith('Person'))?.textContent,
  )
}

/** Selection whose action reports the selected ids. */
function reportingSelection(onAction: (ids: string[]) => void) {
  const selection: GenericTableSelection<Person> = {
    getRowLabel,
    actions: (selected) => (
      <Button onClick={() => onAction(selected.map((person) => person.id))}>
        Act on selected
      </Button>
    ),
  }
  return selection
}

describe('GenericTable', () => {
  it('shows the first page and a summary', () => {
    renderTable()

    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–10 of 25')
  })

  it('pages through the rows and changes the page size', async () => {
    const { user } = renderTable()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByRole('status')).toHaveTextContent('Showing 11–20 of 25')
    expect(names()[0]).toBe('Person 11')

    await user.click(screen.getByRole('combobox', { name: 'Rows per page' }))
    await user.click(await screen.findByRole('option', { name: '50' }))
    expect(bodyRows()).toHaveLength(25)
  })

  it('searches every column and goes back to the first page', async () => {
    const { user } = renderTable()
    await user.click(screen.getByRole('button', { name: 'Next page' }))

    await user.type(screen.getByLabelText('Search people'), '45')

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Showing 1–1 of 1'),
    )
    expect(names()).toEqual(['Person 25'])
  })

  it('offers to clear a search with no matches', async () => {
    const { user } = renderTable()

    await user.type(screen.getByLabelText('Search people'), 'nobody')

    expect(await screen.findByText('No matches')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(
      await screen.findByRole('table', { name: 'People' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Search people')).toHaveValue('')
  })

  it('sorts a column ascending, then descending, then off', async () => {
    const { user } = renderTable()
    const header = screen.getByRole('columnheader', { name: /Age/ })

    await user.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    expect(names()[0]).toBe('Person 01')

    await user.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(names()[0]).toBe('Person 25')

    await user.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'none')
  })

  it('goes back to the first page when the sorting changes', async () => {
    const { user } = renderTable()
    await user.click(screen.getByRole('button', { name: 'Next page' }))

    const header = screen.getByRole('columnheader', { name: /Age/ })
    await user.click(within(header).getByRole('button'))
    await user.click(within(header).getByRole('button'))

    expect(screen.getByRole('status')).toHaveTextContent('Showing 1–10 of 25')
    expect(names()[0]).toBe('Person 25')
  })

  it('selects rows and hands them to the selection actions', async () => {
    const onAction = vi.fn()
    const { user } = renderTable({ selection: reportingSelection(onAction) })

    expect(
      screen.queryByRole('button', { name: 'Act on selected' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Select Person 02' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Person 05' }))

    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Select all rows on this page' }),
    ).toHaveAttribute('aria-checked', 'mixed')
    await user.click(screen.getByRole('button', { name: 'Act on selected' }))

    expect(onAction).toHaveBeenCalledWith(['p2', 'p5'])
  })

  it('selects every row on the page and keeps the selection across pages', async () => {
    const { user } = renderTable({ selection: reportingSelection(vi.fn()) })

    await user.click(
      screen.getByRole('checkbox', { name: 'Select all rows on this page' }),
    )
    expect(screen.getByText('10 selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Person 11' }))
    expect(screen.getByText('11 selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument()
  })

  it('clears the selection when the search changes', async () => {
    const onAction = vi.fn()
    const { user } = renderTable({ selection: reportingSelection(onAction) })
    await user.click(screen.getByRole('checkbox', { name: 'Select Person 01' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Person 02' }))

    await user.type(screen.getByLabelText('Search people'), 'Person 02')

    await waitFor(() =>
      expect(screen.queryByText(/selected$/)).not.toBeInTheDocument(),
    )
    await user.click(screen.getByRole('checkbox', { name: 'Select Person 02' }))
    await user.click(screen.getByRole('button', { name: 'Act on selected' }))
    expect(onAction).toHaveBeenCalledWith(['p2'])
  })

  it('drops rows that leave the data from the selection', async () => {
    const onAction = vi.fn()
    const selection = reportingSelection(onAction)
    const { user, rerender } = renderTable({ selection })
    await user.click(screen.getByRole('checkbox', { name: 'Select Person 01' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Person 02' }))

    rerender({ selection, data: PEOPLE.slice(1) })

    expect(screen.getByText('1 selected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Act on selected' }))
    expect(onAction).toHaveBeenCalledWith(['p2'])
  })

  it('stays on a valid page when rows are removed', async () => {
    const { user, rerender } = renderTable()
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByRole('status')).toHaveTextContent('Showing 21–25 of 25')

    rerender({ data: PEOPLE.slice(0, 20) })

    expect(screen.getByRole('status')).toHaveTextContent('Showing 11–20 of 20')
  })

  it('can keep its search, sort, and page outside the table', async () => {
    const onStateChange = vi.fn()
    // biome-ignore lint/correctness/noComponentHookFactories: a test-only wrapper that needs this test's mock.
    function Controlled() {
      const [state, setState] = useState<GenericTableState>({
        ...DEFAULT_GENERIC_TABLE_STATE,
        sorting: { id: 'age', desc: true },
        page: 2,
      })
      return table({
        state,
        onStateChange: (next, options) => {
          onStateChange(next, options)
          setState(next)
        },
      })
    }
    const user = userEvent.setup()
    render(<Controlled />)

    expect(screen.getByRole('status')).toHaveTextContent('Showing 11–20 of 25')
    expect(names()[0]).toBe('Person 15')

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onStateChange).toHaveBeenLastCalledWith(
      {
        search: '',
        sorting: { id: 'age', desc: true },
        page: 3,
        pageSize: 10,
      },
      { replace: false },
    )
    expect(screen.getByRole('status')).toHaveTextContent('Showing 21–25 of 25')
  })

  it('writes a corrected page back, replacing rather than adding', async () => {
    const onStateChange = vi.fn()
    const state = { ...DEFAULT_GENERIC_TABLE_STATE, page: 3 }
    const { rerender } = renderTable({ state, onStateChange })
    expect(onStateChange).not.toHaveBeenCalled()

    // Page 3 no longer exists once only 15 rows are left.
    rerender({ state, onStateChange, data: PEOPLE.slice(0, 15) })

    expect(screen.getByRole('status')).toHaveTextContent('Showing 11–15 of 15')
    await waitFor(() =>
      expect(onStateChange).toHaveBeenCalledWith(
        { ...state, page: 2 },
        { replace: true },
      ),
    )
  })

  it('shows loading, empty, and error states', async () => {
    const onRetry = vi.fn()
    const { user, rerender } = renderTable({ data: [], isLoading: true })
    expect(screen.getByRole('status')).toHaveTextContent('Loading')

    rerender({ data: [] })
    // Once in the empty state, once in the status announcement.
    expect(screen.getByRole('status')).toHaveTextContent('No results')
    expect(
      screen.getByText('No results', { selector: ':not([role="status"])' }),
    ).toBeInTheDocument()

    rerender({
      data: [],
      errorMessage: 'The server is unavailable.',
      onRetry,
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The server is unavailable.',
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalled()
  })
})
