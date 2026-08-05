import { render, screen } from '@testing-library/react'
import { CaseStudyPlate } from '@/components/work/case-study-plate'

const plate = {
  src: '/work/docdefend-plate.png',
  alt: 'DocDefend+ analysing a clinical note',
  width: 1192,
  height: 640,
  caption: 'synthetic demo data · not clinical use',
}

describe('CaseStudyPlate', () => {
  it('renders the image with its alt text', () => {
    render(<CaseStudyPlate plate={plate} />)
    expect(screen.getByAltText(plate.alt)).toBeInTheDocument()
  })

  it('renders the caption', () => {
    render(<CaseStudyPlate plate={plate} />)
    expect(screen.getByText(plate.caption)).toBeInTheDocument()
  })

  it('renders four registration marks with correct position-to-edge mappings', () => {
    const { container } = render(<CaseStudyPlate plate={plate} />)
    const marks = container.querySelectorAll('.reg-mark')
    expect(marks).toHaveLength(4)

    // Each corner's mark must be found by its position classes and verified
    // to have exactly the correct edge pair for that corner.
    const corners = [
      { posClasses: ['top-0', 'left-0'], edgeClasses: ['border-t', 'border-l'] },
      { posClasses: ['top-0', 'right-0'], edgeClasses: ['border-t', 'border-r'] },
      { posClasses: ['bottom-0', 'left-0'], edgeClasses: ['border-b', 'border-l'] },
      { posClasses: ['bottom-0', 'right-0'], edgeClasses: ['border-b', 'border-r'] },
    ]

    for (const corner of corners) {
      const mark = Array.from(marks).find((m) =>
        corner.posClasses.every((cls) => m.className.includes(cls)),
      )
      expect(mark).toBeDefined()
      for (const edgeClass of corner.edgeClasses) {
        expect(mark?.className).toContain(edgeClass)
      }
    }
  })

  // Regression guard for a bug that shipped: the responsive gate was on the
  // marks themselves (`reg-mark ... hidden lg:block`), which is INERT.
  // `.reg-mark` declares `display: block` unlayered in globals.css, and
  // unlayered CSS outranks Tailwind's `@layer utilities` `.hidden` regardless
  // of specificity — so the marks rendered at every breakpoint and clipped the
  // image corners on mobile. jsdom does not model cascade layers, so this can
  // only be asserted structurally: the gate must live on the wrapper.
  it('gates the marks on a wrapper element, never on the marks themselves', () => {
    const { container } = render(<CaseStudyPlate plate={plate} />)
    const marks = Array.from(container.querySelectorAll('.reg-mark'))
    expect(marks).toHaveLength(4)

    for (const mark of marks) {
      expect(mark.className).not.toMatch(/\bhidden\b/)
      expect(mark.className).not.toMatch(/\blg:block\b/)
    }

    const wrapper = marks[0].parentElement
    expect(wrapper).not.toBeNull()
    // All four marks must share the one gated wrapper.
    for (const mark of marks) {
      expect(mark.parentElement).toBe(wrapper)
    }
    expect(wrapper!.className).toMatch(/\bhidden\b/)
    expect(wrapper!.className).toMatch(/\blg:block\b/)
    // The wrapper carries no .reg-mark class, so nothing unlayered competes
    // with `.hidden` on it.
    expect(wrapper!.classList.contains('reg-mark')).toBe(false)
    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
  })
})
