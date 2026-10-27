import { CASE_STUDIES, getCaseStudy, getAdjacentCaseStudies } from '@/lib/work/case-studies'
import { ACCENT_STYLES } from '@/lib/styles'

// CASE_STUDIES is the single source of truth for /work: the index card grid,
// per-slug pages, prev/next nav (WorkNav — rendered only when a neighbor
// exists), sitemap entries, per-slug OG cards, and JSON-LD all derive from it.
// The array is deliberately small (drafts are quarantined in
// unpublished-drafts.ts), so these tests are written to hold at any length —
// including the current five-entry case.

describe('CASE_STUDIES data integrity', () => {
  it('is a non-empty array (currently five published studies)', () => {
    expect(CASE_STUDIES.length).toBeGreaterThan(0)
    // Pin the current count so an accidental publish/unpublish is noticed.
    expect(CASE_STUDIES).toHaveLength(5)
  })

  it('has unique, non-empty, URL-safe slugs', () => {
    const slugs = CASE_STUDIES.map((c) => c.slug)
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('numbers are unique, zero-padded, and contiguous with array order', () => {
    const numbers = CASE_STUDIES.map((c) => c.number)
    expect(new Set(numbers).size).toBe(numbers.length)
    CASE_STUDIES.forEach((c, i) => {
      expect(c.number).toBe(String(i + 1).padStart(2, '0'))
    })
  })

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s has all required non-empty text fields',
    (_slug, c) => {
      for (const field of [c.title, c.shortTitle, c.summary, c.lead, c.role, c.provenance] as const) {
        expect(typeof field).toBe('string')
        expect(field.trim().length).toBeGreaterThan(0)
      }
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s accent is a valid AccentColor key from ACCENT_STYLES',
    (_slug, c) => {
      expect(Object.keys(ACCENT_STYLES)).toContain(c.accent)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s depth is either "full" or "light"',
    (_slug, c) => {
      expect(['full', 'light']).toContain(c.depth)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s has a non-empty tech array of non-empty strings',
    (_slug, c) => {
      expect(c.tech.length).toBeGreaterThan(0)
      for (const t of c.tech) {
        expect(t.trim().length).toBeGreaterThan(0)
      }
    },
  )
})

describe('CASE_STUDIES sections, metrics, links, embed', () => {
  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s has non-empty sections with non-empty headings and body paragraphs',
    (_slug, c) => {
      expect(c.sections.length).toBeGreaterThan(0)
      for (const s of c.sections) {
        expect(s.heading.trim().length).toBeGreaterThan(0)
        expect(s.body.length).toBeGreaterThan(0)
        for (const p of s.body) {
          expect(typeof p).toBe('string')
          expect(p.trim().length).toBeGreaterThan(0)
        }
      }
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: any section flagged embed: true requires the study to define an embed, at most one such section',
    (_slug, c) => {
      const embedSections = c.sections.filter((s) => s.embed === true)
      if (embedSections.length > 0) {
        expect(c.embed).toBeDefined()
      }
      // The renderer places the study's single embed under the flagged
      // section — two flags would render it twice.
      expect(embedSections.length).toBeLessThanOrEqual(1)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: embed (when present) has an https URL, title, and positive dimensions',
    (_slug, c) => {
      if (!c.embed) return
      expect(c.embed.url).toMatch(/^https:\/\//)
      // Clean view URL contract: no share query params.
      expect(c.embed.url).not.toContain('?')
      expect(c.embed.title.trim().length).toBeGreaterThan(0)
      expect(c.embed.width).toBeGreaterThan(0)
      expect(c.embed.height).toBeGreaterThan(0)
      expect(Number.isInteger(c.embed.width)).toBe(true)
      expect(Number.isInteger(c.embed.height)).toBe(true)
    },
  )

  // Reverse of the flag-requires-payload invariants above. A study can define
  // an embed/figure/plate payload and forget the section flag that renders it —
  // the page then silently omits it, with no type error and a green suite. The
  // renderer only ever draws a payload under a section that flags it, so an
  // unflagged payload is dead data.
  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: every declared embed/figure/plate payload is actually rendered by some section',
    (_slug, c) => {
      if (c.embed) {
        expect(
          c.sections.some((s) => s.embed === true),
          'defines an embed but no section sets embed: true — it would never render',
        ).toBe(true)
      }
      if (c.figure) {
        expect(
          c.sections.some((s) => s.figure === true),
          'defines a figure but no section sets figure: true — it would never render',
        ).toBe(true)
      }
      if (c.plate) {
        expect(
          c.sections.some((s) => s.plate === true),
          'defines a plate but no section sets plate: true — it would never render',
        ).toBe(true)
      }
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: metrics (when present) have non-empty value and label',
    (_slug, c) => {
      if (!c.metrics) return
      expect(c.metrics.length).toBeGreaterThan(0)
      for (const m of c.metrics) {
        expect(m.value.trim().length).toBeGreaterThan(0)
        expect(m.label.trim().length).toBeGreaterThan(0)
      }
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: links have non-empty labels and well-formed hrefs (external ⇒ https, internal ⇒ /path)',
    (_slug, c) => {
      for (const link of c.links) {
        expect(link.label.trim().length).toBeGreaterThan(0)
        if (link.external) {
          expect(link.href).toMatch(/^https:\/\//)
        } else {
          expect(link.href).toMatch(/^\//)
        }
      }
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: any section flagged figure: true requires the study to define a figure, at most one such section',
    (_slug, c) => {
      const figureSections = c.sections.filter((s) => s.figure === true)
      if (figureSections.length > 0) {
        expect(c.figure).toBeDefined()
      }
      expect(figureSections.length).toBeLessThanOrEqual(1)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: any section flagged plate: true requires the study to define a plate, at most one such section',
    (_slug, c) => {
      const plateSections = c.sections.filter((s) => s.plate === true)
      if (plateSections.length > 0) {
        expect(c.plate).toBeDefined()
      }
      expect(plateSections.length).toBeLessThanOrEqual(1)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: figure (when present) has a known kind and a non-empty caption',
    (_slug, c) => {
      if (!c.figure) return
      expect(['grounding-pipeline', 'distillation-recovery']).toContain(c.figure.kind)
      expect(c.figure.caption.trim().length).toBeGreaterThan(0)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: plate (when present) has a local src, alt text, positive integer dimensions, and a caption',
    (_slug, c) => {
      if (!c.plate) return
      expect(c.plate.src).toMatch(/^\/[\w\-/]+\.(png|jpg|webp)$/)
      expect(c.plate.alt.trim().length).toBeGreaterThan(0)
      expect(c.plate.caption.trim().length).toBeGreaterThan(0)
      expect(Number.isInteger(c.plate.width)).toBe(true)
      expect(Number.isInteger(c.plate.height)).toBe(true)
      expect(c.plate.width).toBeGreaterThan(0)
      expect(c.plate.height).toBeGreaterThan(0)
    },
  )
})

describe('CASE_STUDIES tables', () => {
  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: any section flagged table: true requires the study to define a table, at most one such section',
    (_slug, c) => {
      const tableSections = c.sections.filter((s) => s.table === true)
      if (tableSections.length > 0) {
        expect(c.table).toBeDefined()
      }
      expect(tableSections.length).toBeLessThanOrEqual(1)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: a declared table is rendered by some section',
    (_slug, c) => {
      if (!c.table) return
      expect(
        c.sections.some((s) => s.table === true),
        'defines a table but no section sets table: true — it would never render',
      ).toBe(true)
    },
  )

  it.each(CASE_STUDIES.map((c) => [c.slug, c] as const))(
    '%s: table (when present) has a caption, labelled columns, and rows exactly as wide as the header',
    (_slug, c) => {
      if (!c.table) return
      expect(c.table.caption.trim().length).toBeGreaterThan(0)
      expect(c.table.columns.length).toBeGreaterThan(0)
      for (const col of c.table.columns) {
        expect(col.label.trim().length).toBeGreaterThan(0)
      }
      expect(c.table.rows.length).toBeGreaterThan(0)
      for (const row of c.table.rows) {
        expect(row).toHaveLength(c.table.columns.length)
      }
    },
  )
})

// The capstone's public record comes with wording rules (see the comment on
// its entry). These pin the ones a future copy edit could silently break.
describe('capstone case study wording rules', () => {
  const capstone = getCaseStudy('dataset-distillation-vehicle-damage')!
  const allText = [
    capstone.title,
    capstone.summary,
    capstone.lead,
    capstone.role,
    capstone.provenance,
    ...(capstone.metrics ?? []).flatMap((m) => [m.value, m.label]),
    capstone.figure?.caption ?? '',
    capstone.table?.caption ?? '',
    ...capstone.sections.flatMap((s) => [s.heading, ...s.body]),
  ].join(' ')
  const sentences = allText.split(/(?<=[.!?])\s+/)

  it('is published first', () => {
    expect(CASE_STUDIES[0]).toBe(capstone)
  })

  it('says "ran the reported PyTorch runs", never the unqualified "every run"', () => {
    expect(capstone.role).toContain('ran the reported PyTorch runs')
    expect(allText).not.toMatch(/\bevery run\b/i)
  })

  it('never says ResNet-18 "beats" the picks on CarDD — that result is "at or above"', () => {
    for (const sentence of sentences) {
      if (/ResNet-18/.test(sentence) && /\bbeats?\b/i.test(sentence)) {
        expect(sentence, sentence).toMatch(/VehiDE/)
        expect(sentence, sentence).not.toMatch(/CarDD/)
      }
    }
  })

  it('shows no images (no plate) and links only to the public write-up', () => {
    expect(capstone.plate).toBeUndefined()
    expect(capstone.embed).toBeUndefined()
    expect(capstone.links.map((l) => l.href)).toEqual([
      'https://github.com/aabdur1/dataset-distillation-vehicle-damage',
    ])
  })

  it('keeps every validation figure beside its test figure in the table', () => {
    const numeric = capstone.table!.rows.flat().filter((cell) => typeof cell !== 'string')
    expect(numeric.length).toBeGreaterThan(0)
    for (const cell of numeric) {
      expect(cell.aside).toBeDefined()
      expect(cell.asideLabel).toBe('validation')
    }
  })
})

describe('getCaseStudy', () => {
  it('returns the matching study for every known slug', () => {
    for (const c of CASE_STUDIES) {
      expect(getCaseStudy(c.slug)).toBe(c)
    }
  })

  it('returns undefined for an unknown slug', () => {
    expect(getCaseStudy('does-not-exist')).toBeUndefined()
  })

  it('returns undefined for the empty string', () => {
    expect(getCaseStudy('')).toBeUndefined()
  })
})

describe('getAdjacentCaseStudies', () => {
  it('dataset-distillation-vehicle-damage (first) has no prev and parkinsons-voice-screening as next', () => {
    const { prev, next } = getAdjacentCaseStudies('dataset-distillation-vehicle-damage')
    expect(prev).toBeNull()
    expect(next).toBe(getCaseStudy('parkinsons-voice-screening'))
  })

  it('docdefend-agent (middle) has parkinsons-voice-screening as prev and spotify-listening as next', () => {
    const { prev, next } = getAdjacentCaseStudies('docdefend-agent')
    expect(prev).toBe(getCaseStudy('parkinsons-voice-screening'))
    expect(next).toBe(getCaseStudy('spotify-listening'))
  })

  it('airline-flight-patterns (last) has spotify-listening as prev and no next', () => {
    const { prev, next } = getAdjacentCaseStudies('airline-flight-patterns')
    expect(prev).toBe(getCaseStudy('spotify-listening'))
    expect(next).toBeNull()
  })

  it('first study never has a prev; last study never has a next (holds at any array length)', () => {
    const first = getAdjacentCaseStudies(CASE_STUDIES[0].slug)
    expect(first.prev).toBeNull()
    const last = getAdjacentCaseStudies(CASE_STUDIES[CASE_STUDIES.length - 1].slug)
    expect(last.next).toBeNull()
  })

  it('every study points to its exact neighbors by index', () => {
    CASE_STUDIES.forEach((c, i) => {
      const { prev, next } = getAdjacentCaseStudies(c.slug)
      expect(prev).toBe(i > 0 ? CASE_STUDIES[i - 1] : null)
      expect(next).toBe(i < CASE_STUDIES.length - 1 ? CASE_STUDIES[i + 1] : null)
    })
  })

  it('unknown slug yields no neighbors: both prev and next are null', () => {
    const { prev, next } = getAdjacentCaseStudies('does-not-exist')
    expect(prev).toBeNull()
    expect(next).toBeNull()
  })
})
