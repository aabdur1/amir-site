import type { AccentColor } from '@/lib/styles'

// Single source of truth for the /work case-study system.
// The index page, per-project pages, prev/next nav, sitemap entries, and
// JSON-LD schema all derive from this array — mirrors lib/learn/artifacts.ts.
//
// Six earlier case-study drafts live in lib/work/unpublished-drafts.ts (not
// imported anywhere, prose unverified). To publish one: verify every number
// against the source project, move the entry into CASE_STUDIES, and renumber.

export interface CaseStudyLink {
  label: string
  href: string
  // external links get target="_blank" + rel + "(opens in new tab)"
  external?: boolean
}

export interface CaseStudyMetric {
  // A single headline number rendered as a stat tile.
  value: string
  label: string
}

export interface CaseStudyBar {
  // A two-value before/after comparison rendered as paired bars.
  label: string
  from: { value: number; label: string }
  to: { value: number; label: string }
}

export interface CaseStudySection {
  heading: string
  // Each paragraph is one string; rendered as its own <p>.
  body: string[]
  // Render the study's embed (if any) under this section's paragraphs.
  embed?: boolean
}

export interface CaseStudyEmbed {
  // Clean view URL (no share query params); the component adds embed params.
  url: string
  // Iframe title + placeholder copy.
  title: string
  // Author-set fixed size of the Tableau story, used to shape the frame.
  width: number
  height: number
}

export interface CaseStudy {
  slug: string
  number: string
  title: string
  shortTitle: string
  // One-line summary used on cards and in metadata.
  summary: string
  // Longer lead paragraph shown at the top of the case-study page.
  lead: string
  role: string
  provenance: string
  accent: AccentColor
  tech: string[]
  // Whether this project has a full analyst narrative (flagship) or is a
  // lighter honest page. Controls the card badge and page depth.
  depth: 'full' | 'light'
  metrics?: CaseStudyMetric[]
  bars?: CaseStudyBar[]
  embed?: CaseStudyEmbed
  sections: CaseStudySection[]
  links: CaseStudyLink[]
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'airline-flight-patterns',
    number: '01',
    title: 'US Airline Flight Patterns',
    shortTitle: 'Flight Patterns',
    summary:
      'A four-point Tableau story across two years of US commercial flight records and 11 carriers: traffic over time, weekly flights by airline, and the distance-airtime relationship.',
    lead:
      'Southwest operated more weekly flights than any other US carrier in every single week of the two years I analyzed, while flying one of the shortest average airtimes in the set. This Tableau story shows how the flight records reveal that model, and where the data nearly tells you a lie about 2011.',
    role: 'Solo analysis and visualization',
    provenance: 'Coursework · IDS 405 Business Systems Analysis & Design',
    accent: 'peach',
    depth: 'full',
    tech: ['Tableau', 'Tableau Public'],
    metrics: [
      { value: '~345K', label: 'Peak monthly flight records (December 2010)' },
      { value: '11', label: 'US carriers compared' },
      { value: '~1.43B mi', label: 'Southwest total distance flown, the most of any carrier' },
      { value: '~94 min', label: 'Southwest average airtime, among the shortest' },
    ],
    embed: {
      url: 'https://public.tableau.com/views/IP4_17645572320100/Story1',
      title: 'US Airline Flight Patterns — interactive Tableau story',
      width: 1016,
      height: 991,
    },
    sections: [
      {
        heading: 'The finding',
        body: [
          'Two things came out of the data. First, Southwest ran the most weekly flights of any carrier in every week from December 2009 through November 2011, peaking around 13,197 flights in a week, and it did that while flying short hops: the most total distance of any carrier (about 1.43 billion miles) but an average airtime of only about 94 minutes. That combination is the signature of a short-haul, high-frequency route model.',
          'Second, the data itself tried to mislead. Monthly flight counts appear to fall off a cliff in late 2011. They do not. The dataset simply ends in November 2011, so the last months are incomplete. Catching that artifact before a reader mistakes it for an industry decline is as much the point of the story as the charts are.',
        ],
      },
      {
        heading: 'Context',
        body: [
          'This was an individual project (IP4) for IDS 405, Business Systems Analysis & Design. The assignment was to take a real dataset and build a Tableau story that walks a reader through it: not a dashboard dump, but a sequence of captioned views that make one argument at a time.',
        ],
      },
      {
        heading: 'The data',
        body: [
          'The dataset is US commercial airline flight records covering roughly December 2009 through November 2011, spanning 11 carriers: AirTran, Alaska, American, Continental, Delta, Frontier, Hawaiian, JetBlue, Southwest, United, and US Airways.',
          'Monthly record counts hold steady at roughly 330K to 350K across the period, which makes the apparent late-2011 drop stand out immediately if you are looking for it, and easy to misread if you are not.',
        ],
      },
      {
        heading: 'Three views, four story points',
        embed: true,
        body: [
          'The story is built from three views arranged as four captioned story points. The first is a line chart of flights over time: monthly counts holding in that 330K to 350K band with a peak of about 345K in December 2010, plus a caption flagging that the 2011 tail is a data-completeness artifact, not a real decline.',
          'The second is a highlight table of weekly flights by airline. Color intensity does the work here: Southwest is the darkest row in every week of the period, with weekly counts across the table running from about 400 at the low end to about 23,470 at the high end.',
          'The third is a scatter of total distance flown against average airtime, with a trend line showing the expected positive correlation. Southwest sits far off the pack: highest total distance, yet an average airtime of about 94 minutes. Lots of planes, short trips, all day long.',
        ],
      },
      {
        heading: 'What the analysis showed',
        body: [
          'The three views triangulate one conclusion: over this period Southwest ran a short-haul, high-frequency operation at a scale no other US carrier matched, week in and week out. The scatter makes the mechanism visible. Its total mileage comes from flight volume, not flight length.',
          'The quieter lesson is the artifact. Any time-series that ends mid-period will look like a decline in its final months, and a chart reader who does not check the data boundary will walk away with a false story. Flagging it in the caption costs one sentence and saves the reader from the wrong conclusion.',
        ],
      },
      {
        heading: 'What I would extend',
        body: [
          'The record counts measure flights, not passengers or seats, so the natural next step is joining load-factor or capacity data to separate flying often from flying full. I would also add a route-level view, since carrier-level averages hide which city pairs drive the pattern, and a seasonality decomposition to separate the December peaks from the underlying trend.',
        ],
      },
    ],
    links: [
      {
        label: 'View on Tableau Public',
        href: 'https://public.tableau.com/views/IP4_17645572320100/Story1',
        external: true,
      },
      {
        label: 'See my full Tableau portfolio',
        href: 'https://public.tableau.com/app/profile/amir.abdur.rahim/vizzes',
        external: true,
      },
    ],
  },
]

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.slug === slug)
}

export function getAdjacentCaseStudies(slug: string): {
  prev: CaseStudy | null
  next: CaseStudy | null
} {
  const index = CASE_STUDIES.findIndex((c) => c.slug === slug)
  return {
    prev: index > 0 ? CASE_STUDIES[index - 1] : null,
    next: index < CASE_STUDIES.length - 1 ? CASE_STUDIES[index + 1] : null,
  }
}
