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
})
