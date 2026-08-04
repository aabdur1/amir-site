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
  // Author-set fixed size of the Tableau viz, used to shape the frame.
  width: number
  height: number
  // Placeholder motif + button/status noun ("story" / "dashboard").
  kind: 'story' | 'dashboard'
  // Mono caption line on the click-gate placeholder.
  caption: string
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
    slug: 'spotify-listening',
    number: '01',
    title: 'My Spotify Listening, 2021–2026',
    shortTitle: 'Spotify Listening',
    summary:
      'A personal-data pipeline from my own Spotify extended streaming history: 61,230 raw plays cleaned with pandas, genre-enriched via the Last.fm API, and published as a seven-view Tableau dashboard covering 4.7 years of listening.',
    lead:
      'My heaviest listening block is weekday midday, not evening — and midday is also where I skip hardest, peaking at 52.9% on Wednesdays at 1pm against a 45.7% overall skip rate. This dashboard turns 4.7 years of my own Spotify history into seven linked views, including the window where bass music overtook hip-hop and the one hour of the week I have never played music at all.',
    role: 'Solo pipeline, analysis, and dashboard',
    provenance: 'Personal project · my own Spotify data',
    accent: 'sapphire',
    depth: 'full',
    tech: ['Tableau', 'Python', 'pandas', 'Last.fm API'],
    metrics: [
      { value: '1,437', label: 'Hours of music, Dec 2021 – Jul 2026' },
      { value: '57,200', label: 'Music streams kept of 61,230 raw plays' },
      { value: '3,341', label: 'Distinct artists across 8,408 tracks' },
      { value: '45.7%', label: 'Average skip rate (plays under 30 seconds)' },
    ],
    embed: {
      url: 'https://public.tableau.com/views/MySpotifyListening2021-2026/MySpotifyListening20212026',
      title: 'My Spotify Listening, 2021–2026 — interactive Tableau dashboard',
      width: 1000,
      height: 3177,
      kind: 'dashboard',
      caption: 'interactive tableau dashboard · seven linked views',
    },
    sections: [
      {
        heading: 'The finding',
        body: [
          'Three things came out of 4.7 years of my own listening data. The clearest: my heaviest listening happens on weekday middays — the hour-by-day heatmap peaks between roughly 11am and 3pm early in the week — and that same block is where I skip hardest, topping out at 52.9% at Wednesday 1pm against my 45.7% overall rate. That pairing reads like background listening: lots of starts, quick judgments.',
          'Second, the genre mix has a clean before-and-after. Hip-hop/rap carried 2022; bass music takes the top share in the window of my first festivals — Heatwave and North Coast, summer 2023 — and holds it from then on. The annotated line on the dashboard is not a slow drift. It is a handoff.',
          'And one negative-space finding: Friday at 3am is the only hour of the week with zero plays across the entire 4.7-year window.',
        ],
      },
      {
        heading: 'Context',
        body: [
          'This is a personal project, not coursework: my own data, my own questions. Spotify provides a full-history export on request — Privacy Settings, then "extended streaming history" — and everything here is built from that export: pandas notebooks for cleaning and features, the Last.fm API for genres, Tableau Public for the dashboard.',
          'The dashboard is deliberately styled to sit inside this site: Catppuccin Latte palette, colorblind-validated, with a DM Serif Display title card. Load it below and it should read like a page of this site that happens to be Tableau.',
        ],
      },
      {
        heading: 'The data and the pipeline',
        body: [
          'The export arrives as JSON: 61,230 raw play records from December 2021 through July 2026. A set of numbered pandas notebooks concatenates the files, localizes timestamps, applies a real-listen threshold, and derives sessions, skip flags — a skip is a play under 30 seconds — and first-play discovery dates. Excluding podcasts leaves 57,200 music streams: 1,437 hours across 3,341 artists and 8,408 tracks.',
          'The export carries no genre field, so genres come from the Last.fm API: one cached lookup per artist, mapped into six groups — bass music, hip-hop/rap, electronic, classical/score, house/dance, and everything else. Coverage is about 98.3% of artists.',
          'The raw export is personal data, so it never leaves my machine. The repo gitignores it, and what Tableau receives are aggregate CSV extracts, not row-level plays.',
        ],
      },
      {
        heading: 'Seven views, one parameter',
        embed: true,
        body: [
          'The dashboard is seven linked views on one tall canvas. An all-time KPI row sits on top; below it, a monthly-hours line annotated with eras (the February 2023 low of 5.39 hours, the first-festivals window, the start of my MS program, the May 2026 peak of 67.94 hours), a 100% stacked genre mix, an hour-by-day heatmap, a diverging skip-rate heatmap, and top artists colored by genre group with cross-chart hover.',
          'A global Year Select parameter drives five of the seven views. The KPI row ignores it on purpose, so the headline numbers stay whole-history while everything below re-slices. The skip definition and the podcast exclusion are stated on the dashboard itself — the numbers carry their caveats with them.',
        ],
      },
      {
        heading: 'What the analysis showed',
        body: [
          'The midday block is the clearest result: listening concentrates around weekday middays, and skip rate rises with it. High-volume hours are also high-churn hours. The diverging heatmap makes that visible because it is anchored at my own 45.7% average rather than at zero — a red cell means skippier than my normal, not skippy in the abstract.',
          'The genre handoff holds up against the annotations: hip-hop/rap dominant through 2022, bass music taking the top share in the months around summer 2023, the same window as my first festivals. Correlation is not causation, but the timing is unambiguous — and it is the kind of ground truth you only have when the analyst is also the subject.',
          'The honest limitations: a 30-second skip threshold is a proxy for intent, not a measurement of it; genre labels are Last.fm community tags mapped by me into six groups; and the export covers Spotify only, so anything played elsewhere is invisible. All three are stated on the dashboard or in the pipeline rather than smoothed over.',
        ],
      },
      {
        heading: 'What I would extend',
        body: [
          'The repo is queued for a public release: aggregated extracts plus a reproduce path, since anyone can request their own extended streaming history from Spotify. A Top Tracks view is queued for the dashboard itself. Beyond that, the pipeline already computes session and discovery-date features the dashboard does not use yet — session length by time of day, and how long a newly discovered artist survives in rotation, are the two analyses I would build next.',
        ],
      },
    ],
    links: [
      {
        label: 'View on Tableau Public',
        href: 'https://public.tableau.com/app/profile/amir.abdur.rahim/viz/MySpotifyListening2021-2026/MySpotifyListening20212026',
        external: true,
      },
      {
        label: 'See my full Tableau portfolio',
        href: 'https://public.tableau.com/app/profile/amir.abdur.rahim/vizzes',
        external: true,
      },
    ],
  },
  {
    slug: 'airline-flight-patterns',
    number: '02',
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
      kind: 'story',
      caption: 'interactive tableau story · four captioned points',
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
  if (index === -1) return { prev: null, next: null }
  return {
    prev: index > 0 ? CASE_STUDIES[index - 1] : null,
    next: index < CASE_STUDIES.length - 1 ? CASE_STUDIES[index + 1] : null,
  }
}
