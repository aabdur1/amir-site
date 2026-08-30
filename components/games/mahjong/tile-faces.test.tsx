/**
 * The face registry is compile-gated (Record over the Kind union); these
 * tests pin the runtime contract: every kind renders one decorative svg,
 * count-based faces show the right number of marks, names are complete.
 */
import { render } from '@testing-library/react'
import { KINDS, type Kind } from '@/lib/games/mahjong/engine'
import { TileFace, FACE_NAMES } from '@/components/games/mahjong/tile-faces'

it('every kind has a name and renders exactly one aria-hidden svg', () => {
  for (const kind of KINDS) {
    expect(FACE_NAMES[kind]).toBeTruthy()
    const { container, unmount } = render(<TileFace kind={kind} />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    expect(svgs[0]).toHaveAttribute('aria-hidden', 'true')
    unmount()
  }
})

it('dot and bamboo faces carry N marks', () => {
  for (let n = 1; n <= 8; n++) {
    const dots = render(<TileFace kind={`dot-${n}` as Kind} />)
    expect(dots.container.querySelectorAll('circle')).toHaveLength(n)
    dots.unmount()
    const bams = render(<TileFace kind={`bam-${n}` as Kind} />)
    // each stick = body rect + gap rect
    expect(bams.container.querySelectorAll('rect')).toHaveLength(n * 2)
    bams.unmount()
  }
})

it('numeral and wind faces render their glyph text', () => {
  const num = render(<TileFace kind="num-2" />)
  expect(num.container.querySelector('text')?.textContent).toBe('2')
  num.unmount()
  const wind = render(<TileFace kind="wind-n" />)
  expect(wind.container.querySelector('text')?.textContent).toBe('N')
})
