// Tests for the schema-popover table chips (components/learn/table-chips.tsx).
//
// jsdom notes:
// - `window.matchMedia` has no jsdom implementation; the component calls it at
//   event time (`pointerIsFine()`), so a mutable stub lets individual tests —
//   and mid-test flips — control the `(pointer: fine)` hover gate.
// - React synthesizes onMouseEnter/onMouseLeave from mouseover/mouseout, so
//   `fireEvent.mouseEnter` would be a no-op; `user.hover()`/`user.unhover()`
//   fire the real sequences.
// - No ResizeObserver / rAF / timer stubs needed: the popover's viewport clamp
//   only uses getBoundingClientRect + a resize listener, both jsdom-safe.

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TableChips } from '@/components/learn/table-chips'
import { TABLE_SCHEMAS } from '@/lib/learn/schema'

/** Mutable gate read by the matchMedia stub — flip mid-test to change the pointer type. */
let pointerFine = false

beforeEach(() => {
  pointerFine = false
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(pointer: fine)' ? pointerFine : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function queryPopover(table: string) {
  return screen.queryByRole('group', { name: `${table} table schema` })
}

describe('TableChips', () => {
  it('renders one button chip per known table', () => {
    render(<TableChips tables={['patients', 'encounters', 'labs']} idPrefix="ex1" />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'patients' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'encounters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'labs' })).toBeInTheDocument()
    // All closed initially.
    for (const b of buttons) expect(b).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('renders an unknown table name as static text, not an interactive chip', async () => {
    pointerFine = true
    const user = userEvent.setup()
    render(<TableChips tables={['patients', 'zebra_table']} idPrefix="ex1" />)

    // Only the known table becomes a button.
    expect(screen.getAllByRole('button')).toHaveLength(1)
    const staticLabel = screen.getByText('zebra_table')
    expect(staticLabel.tagName).toBe('SPAN')

    // Hovering the static text opens nothing.
    await user.hover(staticLabel)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('click toggles the popover open and closed (coarse pointer)', async () => {
    const user = userEvent.setup()
    render(<TableChips tables={['patients']} idPrefix="ex1" />)
    const chip = screen.getByRole('button', { name: 'patients' })

    await user.click(chip)
    const popover = queryPopover('patients')
    expect(popover).toBeInTheDocument()
    expect(chip).toHaveAttribute('aria-expanded', 'true')
    expect(chip).toHaveAttribute('aria-controls', popover!.id)

    await user.click(chip)
    expect(queryPopover('patients')).not.toBeInTheDocument()
    expect(chip).toHaveAttribute('aria-expanded', 'false')
    expect(chip).not.toHaveAttribute('aria-controls')
  })

  it('click also toggles closed when hover opened the popover first (fine pointer)', async () => {
    pointerFine = true
    const user = userEvent.setup()
    render(<TableChips tables={['patients']} idPrefix="ex1" />)
    const chip = screen.getByRole('button', { name: 'patients' })

    // First click: hover (from the pointer move) opens, the click pins — still open.
    await user.click(chip)
    expect(queryPopover('patients')).toBeInTheDocument()

    // Second click: clears both the pin and the hover state — closes under the cursor.
    await user.click(chip)
    expect(queryPopover('patients')).not.toBeInTheDocument()
  })

  it('Enter and Space toggle the popover from the keyboard', async () => {
    const user = userEvent.setup()
    render(<TableChips tables={['patients']} idPrefix="ex1" />)
    const chip = screen.getByRole('button', { name: 'patients' })

    await user.tab()
    expect(chip).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(queryPopover('patients')).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(queryPopover('patients')).not.toBeInTheDocument()

    await user.keyboard('[Space]')
    expect(queryPopover('patients')).toBeInTheDocument()
    await user.keyboard('[Space]')
    expect(queryPopover('patients')).not.toBeInTheDocument()
  })

  it('open popover shows the table name, row count, and every column with its type', async () => {
    const user = userEvent.setup()
    render(<TableChips tables={['patients']} idPrefix="ex1" />)

    await user.click(screen.getByRole('button', { name: 'patients' }))
    const popover = within(queryPopover('patients')! as HTMLElement)

    const schema = TABLE_SCHEMAS['patients']
    expect(popover.getByText(schema.name)).toBeInTheDocument()
    expect(popover.getByText(`${schema.rows.toLocaleString()} rows`)).toBeInTheDocument()
    for (const col of schema.columns) {
      expect(popover.getByText(col.name)).toBeInTheDocument()
    }
    // Types render alongside (patients has 3 text columns, 1 integer, 1 date).
    expect(popover.getAllByText('text')).toHaveLength(3)
    expect(popover.getByText('integer')).toBeInTheDocument()
    expect(popover.getByText('date')).toBeInTheDocument()
  })

  it('Escape closes the popover and returns focus to the chip', async () => {
    pointerFine = true
    const user = userEvent.setup()
    render(<TableChips tables={['patients']} idPrefix="ex1" />)
    const chip = screen.getByRole('button', { name: 'patients' })

    // Open via hover so the chip does NOT already have focus — makes the
    // "returns focus" assertion meaningful.
    await user.hover(chip)
    expect(queryPopover('patients')).toBeInTheDocument()
    expect(chip).not.toHaveFocus()

    await user.keyboard('{Escape}')
    expect(queryPopover('patients')).not.toBeInTheDocument()
    expect(chip).toHaveFocus()
  })

  it('clicking outside closes the popover', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <TableChips tables={['patients']} idPrefix="ex1" />
        <p>elsewhere</p>
      </div>,
    )

    await user.click(screen.getByRole('button', { name: 'patients' }))
    expect(queryPopover('patients')).toBeInTheDocument()

    await user.click(screen.getByText('elsewhere'))
    expect(queryPopover('patients')).not.toBeInTheDocument()
  })

  it('blurring the chip (tab away) closes the popover', async () => {
    const user = userEvent.setup()
    render(<TableChips tables={['patients', 'encounters']} idPrefix="ex1" />)

    await user.tab() // focus patients chip
    await user.keyboard('{Enter}')
    expect(queryPopover('patients')).toBeInTheDocument()

    await user.tab() // focus moves to the encounters chip, outside patients' wrapper
    expect(screen.getByRole('button', { name: 'encounters' })).toHaveFocus()
    expect(queryPopover('patients')).not.toBeInTheDocument()
  })

  it('hover does NOT open the popover on a coarse pointer', async () => {
    pointerFine = false
    const user = userEvent.setup()
    render(<TableChips tables={['patients']} idPrefix="ex1" />)

    await user.hover(screen.getByRole('button', { name: 'patients' }))
    expect(queryPopover('patients')).not.toBeInTheDocument()
  })

  it('hover opens and unhover closes the popover on a fine pointer', async () => {
    pointerFine = true
    const user = userEvent.setup()
    render(<TableChips tables={['patients']} idPrefix="ex1" />)
    const chip = screen.getByRole('button', { name: 'patients' })

    await user.hover(chip)
    expect(queryPopover('patients')).toBeInTheDocument()

    await user.unhover(chip)
    expect(queryPopover('patients')).not.toBeInTheDocument()
  })

  it('opening a chip in one group closes the popover in another group (module-level claim)', async () => {
    const user = userEvent.setup()
    render(<TableChips tables={['patients']} idPrefix="g1" />)
    render(<TableChips tables={['encounters']} idPrefix="g2" />)

    // Pin group 1 open via click while the pointer is coarse (no hover state involved).
    await user.click(screen.getByRole('button', { name: 'patients' }))
    expect(queryPopover('patients')).toBeInTheDocument()

    // Now open group 2 via hover only — no mousedown, no focus change — so the
    // ONLY mechanism that can close group 1 is the module-level claim/release.
    pointerFine = true
    await user.hover(screen.getByRole('button', { name: 'encounters' }))

    expect(queryPopover('encounters')).toBeInTheDocument()
    expect(queryPopover('patients')).not.toBeInTheDocument()
  })

  it('opening a second chip within the same group closes the first', async () => {
    const user = userEvent.setup()
    render(<TableChips tables={['patients', 'encounters']} idPrefix="ex1" />)

    await user.click(screen.getByRole('button', { name: 'patients' }))
    expect(queryPopover('patients')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'encounters' }))
    expect(queryPopover('encounters')).toBeInTheDocument()
    expect(queryPopover('patients')).not.toBeInTheDocument()
  })
})
