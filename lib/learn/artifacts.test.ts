import { ARTIFACTS, getArtifact, getAdjacentArtifacts } from '@/lib/learn/artifacts'

// ARTIFACTS is the single source of truth for the learn section: the index
// page, prev/next nav, SectionRail targets, per-slug OG images, sitemap
// entries, and JSON-LD schemas all derive from it. These tests pin the data
// invariants those consumers rely on.

describe('ARTIFACTS data integrity', () => {
  it('contains exactly 10 artifacts (the documented count)', () => {
    expect(ARTIFACTS).toHaveLength(10)
  })

  it('has unique, non-empty slugs', () => {
    const slugs = ARTIFACTS.map((a) => a.slug)
    for (const slug of slugs) {
      expect(slug).toBeTruthy()
      expect(slug.trim()).toBe(slug)
      expect(slug.length).toBeGreaterThan(0)
    }
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('uses URL-safe slugs (lowercase letters, digits, hyphens)', () => {
    for (const a of ARTIFACTS) {
      expect(a.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('numbers are unique, zero-padded, and contiguous with array order (01..10)', () => {
    const numbers = ARTIFACTS.map((a) => a.number)
    expect(new Set(numbers).size).toBe(numbers.length)
    ARTIFACTS.forEach((a, i) => {
      expect(a.number).toBe(String(i + 1).padStart(2, '0'))
    })
  })

  it.each(ARTIFACTS.map((a) => [a.slug, a] as const))(
    '%s has non-empty title, shortTitle, and description',
    (_slug, a) => {
      expect(a.title.trim().length).toBeGreaterThan(0)
      expect(a.shortTitle.trim().length).toBeGreaterThan(0)
      expect(a.description.trim().length).toBeGreaterThan(0)
    },
  )

  it.each(ARTIFACTS.map((a) => [a.slug, a] as const))(
    '%s has a non-empty subtopics array of non-empty strings',
    (_slug, a) => {
      expect(Array.isArray(a.subtopics)).toBe(true)
      expect(a.subtopics.length).toBeGreaterThan(0)
      for (const s of a.subtopics) {
        expect(typeof s).toBe('string')
        expect(s.trim().length).toBeGreaterThan(0)
      }
    },
  )
})

describe('ARTIFACTS sections (SectionRail contract)', () => {
  it.each(ARTIFACTS.map((a) => [a.slug, a] as const))(
    '%s sectionCount matches sections.length',
    (_slug, a) => {
      expect(a.sections.length).toBe(a.sectionCount)
      expect(a.sectionCount).toBeGreaterThan(0)
    },
  )

  it.each(ARTIFACTS.map((a) => [a.slug, a] as const))(
    '%s section ids are non-empty and unique within the artifact',
    (_slug, a) => {
      const ids = a.sections.map((s) => s.id)
      for (const id of ids) {
        expect(id.trim().length).toBeGreaterThan(0)
        // ids double as DOM h2 ids and #fragment anchors — no spaces allowed
        expect(id).toMatch(/^[a-z0-9-]+$/)
      }
      expect(new Set(ids).size).toBe(ids.length)
    },
  )

  it('section ids are unique across ALL artifacts (each has its own prefix)', () => {
    const allIds = ARTIFACTS.flatMap((a) => a.sections.map((s) => s.id))
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it.each(ARTIFACTS.map((a) => [a.slug, a] as const))(
    '%s section labels are non-empty and <= 13 chars (rail fit at 1280px)',
    (_slug, a) => {
      for (const s of a.sections) {
        expect(s.label.trim().length).toBeGreaterThan(0)
        expect(s.label.length).toBeLessThanOrEqual(13)
      }
    },
  )
})

describe('getArtifact', () => {
  it('returns the matching artifact for every known slug', () => {
    for (const a of ARTIFACTS) {
      expect(getArtifact(a.slug)).toBe(a)
    }
  })

  it('returns undefined for an unknown slug', () => {
    expect(getArtifact('does-not-exist')).toBeUndefined()
  })

  it('returns undefined for the empty string', () => {
    expect(getArtifact('')).toBeUndefined()
  })

  it('is exact-match (no case folding, no trimming)', () => {
    expect(getArtifact('SQL')).toBeUndefined()
    expect(getArtifact(' sql')).toBeUndefined()
  })
})

describe('getAdjacentArtifacts', () => {
  it('first artifact has no prev and the second as next', () => {
    const { prev, next } = getAdjacentArtifacts(ARTIFACTS[0].slug)
    expect(prev).toBeNull()
    expect(next).toBe(ARTIFACTS[1])
  })

  it('last artifact has the second-to-last as prev and no next', () => {
    const last = ARTIFACTS[ARTIFACTS.length - 1]
    const { prev, next } = getAdjacentArtifacts(last.slug)
    expect(prev).toBe(ARTIFACTS[ARTIFACTS.length - 2])
    expect(next).toBeNull()
  })

  it('every middle artifact points to its exact neighbors', () => {
    for (let i = 1; i < ARTIFACTS.length - 1; i++) {
      const { prev, next } = getAdjacentArtifacts(ARTIFACTS[i].slug)
      expect(prev).toBe(ARTIFACTS[i - 1])
      expect(next).toBe(ARTIFACTS[i + 1])
    }
  })

  it('unknown slug yields no neighbors: both prev and next are null', () => {
    const { prev, next } = getAdjacentArtifacts('does-not-exist')
    expect(prev).toBeNull()
    expect(next).toBeNull()
  })
})
