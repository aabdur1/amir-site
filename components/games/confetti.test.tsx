/**
 * Tests for the shared ConfettiBurst celebration. jsdom has no matchMedia
 * (stubbed per-test — hooks.test.ts precedent) and no 2d canvas context, so
 * getContext is mocked to null; the component treats that as "nothing to
 * draw" (real browsers can return null too, e.g. after context loss). The
 * particle animation itself is visual-only and verified in a browser.
 */
import { render } from '@testing-library/react'
import { ConfettiBurst } from '@/components/games/confetti'

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }))
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('mounts a decorative fixed canvas when motion is allowed', () => {
  stubReducedMotion(false)
  const { container } = render(<ConfettiBurst />)
  const canvas = container.querySelector('canvas')
  expect(canvas).toBeInTheDocument()
  expect(canvas).toHaveAttribute('aria-hidden', 'true')
})

it('renders nothing at all under prefers-reduced-motion', () => {
  stubReducedMotion(true)
  const { container } = render(<ConfettiBurst />)
  expect(container).toBeEmptyDOMElement()
})
