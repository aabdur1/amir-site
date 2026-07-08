import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortControls } from '@/components/gallery/sort-controls'

const OPTION_LABELS = ['Shuffle', 'Date', 'Camera', 'Lens']
const OPTION_VALUES = ['shuffle', 'date', 'camera', 'lens']

function getTrigger() {
  // The trigger has no aria-label; its accessible name is its text content.
  return screen.getByRole('button', { name: /^Sort:/ })
}

describe('SortControls', () => {
  let onChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onChange = vi.fn()
  })

  describe('trigger button (closed state)', () => {
    it('renders with the current sort label, aria-haspopup="menu", and aria-expanded="false"', () => {
      render(<SortControls value="date" onChange={onChange} />)
      const trigger = getTrigger()

      expect(trigger).toHaveTextContent('Sort: Date')
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      // aria-controls is only present while open
      expect(trigger).not.toHaveAttribute('aria-controls')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('falls back to the Shuffle label for an unknown value', () => {
      render(<SortControls value="bogus" onChange={onChange} />)
      expect(getTrigger()).toHaveTextContent('Sort: Shuffle')
    })
  })

  describe('opening via click', () => {
    it('opens the menu, flips aria-expanded, and wires aria-controls to the menu id', async () => {
      const user = userEvent.setup()
      render(<SortControls value="date" onChange={onChange} />)
      const trigger = getTrigger()

      await user.click(trigger)

      const menu = screen.getByRole('menu', { name: 'Sort photos by' })
      expect(menu).toHaveAttribute('id', 'sort-menu')
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(trigger).toHaveAttribute('aria-controls', 'sort-menu')
    })

    it('lists all four sort modes as menuitems in order', async () => {
      const user = userEvent.setup()
      render(<SortControls value="date" onChange={onChange} />)

      await user.click(getTrigger())

      const items = screen.getAllByRole('menuitem')
      expect(items).toHaveLength(4)
      expect(items.map((el) => el.textContent)).toEqual(OPTION_LABELS)
      OPTION_VALUES.forEach((value, i) => {
        expect(items[i]).toHaveAttribute('id', `sort-option-${value}`)
      })
    })

    it('marks only the currently-selected mode with aria-current', async () => {
      const user = userEvent.setup()
      render(<SortControls value="camera" onChange={onChange} />)

      await user.click(getTrigger())

      expect(screen.getByRole('menuitem', { name: 'Camera' })).toHaveAttribute(
        'aria-current',
        'true'
      )
      for (const label of ['Shuffle', 'Date', 'Lens']) {
        expect(screen.getByRole('menuitem', { name: label })).not.toHaveAttribute('aria-current')
      }
    })

    it('moves focus to the currently-selected menuitem on open', async () => {
      const user = userEvent.setup()
      render(<SortControls value="camera" onChange={onChange} />)

      await user.click(getTrigger())

      expect(screen.getByRole('menuitem', { name: 'Camera' })).toHaveFocus()
    })

    it('clicking the trigger again closes the menu', async () => {
      const user = userEvent.setup()
      render(<SortControls value="date" onChange={onChange} />)
      const trigger = getTrigger()

      await user.click(trigger)
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.click(trigger)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('selecting a mode', () => {
    it('invokes onChange with the mode value and closes the menu', async () => {
      const user = userEvent.setup()
      render(<SortControls value="date" onChange={onChange} />)

      await user.click(getTrigger())
      await user.click(screen.getByRole('menuitem', { name: 'Lens' }))

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('lens')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false')
    })

    it('passes each option value verbatim', async () => {
      const user = userEvent.setup()
      for (const [i, label] of OPTION_LABELS.entries()) {
        const { unmount } = render(<SortControls value="date" onChange={onChange} />)
        await user.click(getTrigger())
        await user.click(screen.getByRole('menuitem', { name: label }))
        expect(onChange).toHaveBeenLastCalledWith(OPTION_VALUES[i])
        unmount()
      }
      expect(onChange).toHaveBeenCalledTimes(4)
    })
  })

  describe('dismissal', () => {
    it('closes on outside mousedown without calling onChange', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <SortControls value="date" onChange={onChange} />
          <span data-testid="outside">elsewhere</span>
        </div>
      )

      await user.click(getTrigger())
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.click(screen.getByTestId('outside'))

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false')
      expect(onChange).not.toHaveBeenCalled()
    })

    it('closes when focus leaves the container (blur)', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <SortControls value="lens" onChange={onChange} />
          <button type="button">outside button</button>
        </div>
      )

      // Open — focus lands on the selected item, "Lens", the last menuitem.
      await user.click(getTrigger())
      expect(screen.getByRole('menuitem', { name: 'Lens' })).toHaveFocus()

      // Tab off the last menuitem: focus exits the container entirely.
      await user.tab()

      expect(screen.getByRole('button', { name: 'outside button' })).toHaveFocus()
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false')
    })

    it('does not close when focus moves between elements inside the container', async () => {
      const user = userEvent.setup()
      render(<SortControls value="shuffle" onChange={onChange} />)

      await user.click(getTrigger())
      expect(screen.getByRole('menuitem', { name: 'Shuffle' })).toHaveFocus()

      // Tab from Shuffle to Date — still inside the container.
      await user.tab()

      expect(screen.getByRole('menuitem', { name: 'Date' })).toHaveFocus()
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })
  })

  describe('keyboard interaction', () => {
    it('opens with Enter on the trigger and focuses the selected item', async () => {
      const user = userEvent.setup()
      render(<SortControls value="camera" onChange={onChange} />)

      await user.tab()
      expect(getTrigger()).toHaveFocus()

      await user.keyboard('{Enter}')

      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('menuitem', { name: 'Camera' })).toHaveFocus()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('opens with Space on the trigger', async () => {
      const user = userEvent.setup()
      render(<SortControls value="date" onChange={onChange} />)

      await user.tab()
      await user.keyboard(' ')

      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Date' })).toHaveFocus()
    })

    it('opens with ArrowDown on the trigger', async () => {
      const user = userEvent.setup()
      render(<SortControls value="date" onChange={onChange} />)

      await user.tab()
      await user.keyboard('{ArrowDown}')

      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Date' })).toHaveFocus()
    })

    it('navigates with ArrowDown/ArrowUp and activates with Enter', async () => {
      const user = userEvent.setup()
      render(<SortControls value="shuffle" onChange={onChange} />)

      await user.tab()
      await user.keyboard('{Enter}') // open; focus on Shuffle (index 0)
      expect(screen.getByRole('menuitem', { name: 'Shuffle' })).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('menuitem', { name: 'Date' })).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      expect(screen.getByRole('menuitem', { name: 'Camera' })).toHaveFocus()

      await user.keyboard('{ArrowUp}')
      expect(screen.getByRole('menuitem', { name: 'Date' })).toHaveFocus()

      await user.keyboard('{Enter}')
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('date')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('clamps arrow navigation at the first and last items', async () => {
      const user = userEvent.setup()
      render(<SortControls value="shuffle" onChange={onChange} />)

      await user.tab()
      await user.keyboard('{Enter}') // focus on Shuffle (first)

      await user.keyboard('{ArrowUp}') // already at first — stays
      expect(screen.getByRole('menuitem', { name: 'Shuffle' })).toHaveFocus()

      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
      expect(screen.getByRole('menuitem', { name: 'Lens' })).toHaveFocus()

      await user.keyboard('{ArrowDown}') // already at last — stays
      expect(screen.getByRole('menuitem', { name: 'Lens' })).toHaveFocus()
    })

    it('closes with Escape from inside the menu without selecting', async () => {
      const user = userEvent.setup()
      render(<SortControls value="date" onChange={onChange} />)

      await user.tab()
      await user.keyboard('{Enter}')
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false')
      expect(onChange).not.toHaveBeenCalled()
    })

    it('closes with Escape on the trigger', async () => {
      const user = userEvent.setup()
      render(<SortControls value="date" onChange={onChange} />)
      const trigger = getTrigger()

      await user.click(trigger)
      expect(screen.getByRole('menu')).toBeInTheDocument()

      // Return focus to the trigger, then Escape.
      trigger.focus()
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
