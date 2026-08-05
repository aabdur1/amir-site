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

  it('renders four registration marks, each with a visible border edge', () => {
    const { container } = render(<CaseStudyPlate plate={plate} />)
    const marks = container.querySelectorAll('.reg-mark')
    expect(marks).toHaveLength(4)
    // .reg-mark sets border-color only — without a border-width utility the
    // mark is invisible. Every mark must carry two edge classes.
    for (const mark of Array.from(marks)) {
      const cls = mark.className
      expect(/border-[tb]\b/.test(cls)).toBe(true)
      expect(/border-[lr]\b/.test(cls)).toBe(true)
    }
  })
})
