import { render, screen, within } from '@testing-library/react'
import { vi } from 'vitest'
import { CaseStudyTable } from '@/components/work/case-study-table'
import { DistillationRecovery } from '@/components/work/distillation-recovery'
import { getCaseStudy } from '@/lib/work/case-studies'

// The capstone's two results pieces: the table (test beside validation) and
// the recovered-share chart. Both are drawn from the reported numbers only.

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

const capstone = getCaseStudy('dataset-distillation-vehicle-damage')!

describe('CaseStudyTable (capstone results)', () => {
  it('renders a header cell per column and a row header per row', () => {
    render(<CaseStudyTable table={capstone.table!} />)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader')).toHaveLength(capstone.table!.columns.length)
    expect(within(table).getAllByRole('rowheader')).toHaveLength(capstone.table!.rows.length)
  })

  it('gives the repeated "Seeds ahead" headers distinct accessible names', () => {
    render(<CaseStudyTable table={capstone.table!} />)
    expect(screen.getByRole('columnheader', { name: 'ConvNet seeds ahead' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'ResNet-18 seeds ahead' })).toBeInTheDocument()
  })

  it('shows each validation figure in brackets beside its test figure, and names it for screen readers', () => {
    render(<CaseStudyTable table={capstone.table!} />)
    // CarDD, 10 per class, ConvNet: +7.3 on test, +7.1 on validation
    const cell = screen.getByText('+7.3').closest('td')!
    expect(cell).toHaveTextContent('+7.3 [+7.1]')
    expect(within(cell).getByText('(validation +7.1)')).toHaveClass('sr-only')
  })

  it('scrolls inside a focusable region rather than widening the page', () => {
    render(<CaseStudyTable table={capstone.table!} />)
    const region = screen.getByRole('region')
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region.className).toContain('overflow-x-auto')
    // Positioned, so the absolute sr-only spans anchor inside the scroll box
    // instead of the article (they widened the page to 491px at 320px).
    expect(region.className.split(/\s+/)).toContain('relative')
  })
})

describe('DistillationRecovery', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exposes the chart as one labelled image carrying all four test numbers', () => {
    render(<DistillationRecovery />)
    const img = screen.getByRole('img')
    const name = img.getAttribute('aria-label') ?? ''
    for (const n of ['84%', '78%', '83%', '80%']) {
      expect(name).toContain(n)
    }
    expect(name).toMatch(/test split/)
  })

  it('direct-labels every bar, so color never carries a value alone', () => {
    const { container } = render(<DistillationRecovery />)
    const bars = container.querySelectorAll('.spark-bar')
    expect(bars).toHaveLength(4)
    for (const label of ['84%', '78%', '83%', '80%']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('draws bars at heights proportional to the reported shares (zero baseline)', () => {
    const { container } = render(<DistillationRecovery />)
    const heights = Array.from(container.querySelectorAll('.spark-bar')).map(
      (bar) => (bar.parentElement as HTMLElement).style.height,
    )
    expect(heights).toEqual(['78%', '84%', '80%', '83%'])
  })
})
