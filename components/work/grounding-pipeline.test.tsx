import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { GroundingPipeline } from '@/components/work/grounding-pipeline'

// Mock IntersectionObserver (jsdom provides none; stubbed for useScrollReveal)
class MockIntersectionObserver {
  readonly callback: IntersectionObserverCallback
  readonly options: IntersectionObserverInit | undefined
  observed: Element[] = []

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
  }

  observe(el: Element) {
    this.observed.push(el)
  }

  unobserve(el: Element) {
    this.observed = this.observed.filter((e) => e !== el)
  }

  disconnect() {
    // no-op
  }

  takeRecords() {
    return []
  }
}

function stubIntersectionObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    MockIntersectionObserver as unknown as typeof IntersectionObserver
  )
}

describe('GroundingPipeline', () => {
  beforeEach(() => {
    stubIntersectionObserver()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it('exposes the diagram to assistive tech as a single labelled image', () => {
    render(<GroundingPipeline />)
    const img = screen.getByRole('img')
    expect(img).toHaveAccessibleName(/grounding/i)
  })

  it('names every stage of the pipeline in the accessible description', () => {
    render(<GroundingPipeline />)
    const img = screen.getByRole('img')
    const name = img.getAttribute('aria-label') ?? ''
    for (const stage of ['mask', 'Gemini', 'gate', 'terminology', 'reconcile']) {
      expect(name.toLowerCase()).toContain(stage.toLowerCase())
    }
  })

  it('draws every solid stroke through the shared draw-stroke class', () => {
    const { container } = render(<GroundingPipeline />)
    const drawn = container.querySelectorAll('.draw-stroke')
    expect(drawn.length).toBeGreaterThan(0)
    // draw-stroke relies on pathLength normalisation; a stroke without it
    // animates from the wrong dash length.
    for (const el of Array.from(drawn)) {
      expect(el.getAttribute('pathLength')).toBe('100')
    }
  })

  it('never puts draw-stroke on a dashed stroke (it would destroy the dash pattern)', () => {
    const { container } = render(<GroundingPipeline />)
    for (const el of Array.from(container.querySelectorAll('.draw-stroke'))) {
      expect(el.getAttribute('stroke-dasharray')).toBeNull()
    }
  })

  it('keeps every label at or above the 12px readable-text floor', () => {
    const { container } = render(<GroundingPipeline />)
    const texts = container.querySelectorAll('text')
    expect(texts.length).toBeGreaterThan(0)
    for (const t of Array.from(texts)) {
      expect(Number(t.getAttribute('font-size'))).toBeGreaterThanOrEqual(12)
    }
  })
})
