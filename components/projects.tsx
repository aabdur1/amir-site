"use client";

import Link from "next/link";
import Image from "next/image";
import { useScrollReveal } from "@/lib/hooks";
import { ACCENT_STYLES } from "@/lib/styles";
import { SectionDivider } from "@/components/section-divider";
import { SectionHeader } from "@/components/section-header";

const STRIPE_STYLES = {
  sapphire: "border-t-sapphire dark:border-t-sapphire-dark",
  mauve: "border-t-mauve dark:border-t-mauve-dark",
  peach: "border-t-peach dark:border-t-peach-dark",
  lavender: "border-t-lavender dark:border-t-lavender-dark",
  rosewater: "border-t-rosewater dark:border-t-rosewater-dark",
} as const;

const projects = [
  {
    name: "My Spotify Listening, 2021–2026",
    subtitle: "Personal-Data Pipeline & Tableau Dashboard",
    provenance: "Personal project · Full case study",
    description:
      "4.7 years of my own Spotify extended streaming history — 61,230 raw plays cleaned to 57,200 music streams with pandas, genre-enriched via the Last.fm API (~98.3% artist coverage), and published as a seven-view Tableau dashboard: midday listening peaks, a 45.7% skip-rate anchor, and the week's one silent hour. Includes the live interactive viz.",
    pills: ["Tableau", "Python", "pandas", "Last.fm API"],
    accent: "sapphire" as const,
    url: "/work/spotify-listening",
    tier: "featured" as const,
  },
  {
    name: "DocDefend+",
    subtitle: "Clinical Documentation QA Platform",
    provenance: "Graduate coursework · UIC MS MIS",
    description:
      "Full-stack app using Claude AI to validate whether clinical notes support billing codes before claim submission. Defensibility scoring, E/M recommendations, and financial impact analysis.",
    pills: ["React", "Express", "Claude API", "Tailwind"],
    accent: "sapphire" as const,
    url: "https://www.docdefend.health",
    tier: "emphasized" as const,
  },
  {
    name: "Parkinson's Voice Screening",
    subtitle: "Clinical ML from Acoustic Features",
    provenance: "Graduate coursework · UIC MS MIS",
    description:
      "Binary classification of Parkinson's patients vs healthy controls from sustained vowel recordings (n=81). Extracted 167 acoustic features (MFCCs, jitter/shimmer, spectral contrast) across 4 classifier families; LR odds ratios, Hosmer-Lemeshow calibration, and Youden's J threshold optimization for clinical interpretability. Best model AUC 0.94 (0.88–0.90 cross-validated).",
    pills: ["Python", "scikit-learn", "Parselmouth", "librosa"],
    accent: "mauve" as const,
    url: "https://github.com/aabdur1/parkinsons-voice-screening",
    tier: "emphasized" as const,
  },
  {
    name: "WIEIAD Risk Scoring",
    subtitle: "Multimodal ED-Signal & Diet-Quality Pipeline",
    provenance: "Graduate coursework · UIC MS MIS",
    description:
      "Multimodal analysis of 1,100+ 'What I Eat in a Day' TikToks — Whisper, OCR, and CLIP features scored across five ED risk signals; coded-hashtag videos showed 2× the mainstream signal prevalence. Gemini whole-video analysis of 467 video-days against HEI-2020.",
    pills: ["Whisper", "CLIP", "Gemini", "LLM"],
    accent: "lavender" as const,
    url: null,
    tier: "standard" as const,
  },
  {
    name: "Theli",
    subtitle: "Privacy-first iOS Nutrition Scanner",
    provenance: "Independent product · Coming soon — App Store",
    description:
      "Barcode lookup + on-device label OCR, Apple Health sync. No accounts, no ads, no tracking.",
    pills: ["Swift 6", "SwiftUI", "Vision OCR", "HealthKit"],
    accent: "rosewater" as const,
    url: "https://theli.app",
    tier: "standard" as const,
  },
  {
    name: "LightERP",
    subtitle: "Enterprise Resource Planning System",
    provenance: "Graduate coursework · UIC MS MIS",
    description:
      "React MVP with Firebase Cloud Firestore and full UML documentation suite.",
    pills: ["React", "Firebase", "UML"],
    accent: "mauve" as const,
    url: "https://github.com/aabdur1",
    tier: "standard" as const,
  },
  {
    name: "CTF & Security Labs",
    subtitle: "Capture the Flag & Cloud Security",
    provenance: "SANS competition",
    description:
      "Top 20 regionally in the SANS AWS Skills to Jobs CTF (7,498 pts). Network forensics, packet analysis, and AWS security labs covering KMS, VPC, S3, and IAM.",
    pills: ["SANS CTF", "AWS", "KMS", "Forensics"],
    accent: "lavender" as const,
    url: null,
    tier: "standard" as const,
  },
  {
    name: "StudentPM",
    subtitle: "Project Management Application",
    provenance: "Graduate coursework · UIC MS MIS",
    description:
      "JavaFX desktop app with MVC architecture, SQLite integration, and user authentication.",
    pills: ["JavaFX", "MVC", "SQLite", "Auth"],
    accent: "sapphire" as const,
    url: "https://github.com/aabdur1",
    tier: "standard" as const,
  },
  {
    name: "US Airline Flight Patterns",
    subtitle: "Tableau Data-Visualization Story",
    provenance: "Coursework · IDS 405 · Full case study",
    description:
      "A four-point Tableau story across two years of US flight records and 11 carriers: traffic over time (with a flagged data-completeness artifact), weekly flights by airline, and the distance-airtime relationship. Includes the live interactive viz.",
    pills: ["Tableau", "Data viz", "Storytelling"],
    accent: "peach" as const,
    url: "/work/airline-flight-patterns",
    tier: "standard" as const,
  },
];

type Project = (typeof projects)[number];

const entryStyle = (visible: boolean, i: number): React.CSSProperties => ({
  opacity: 0,
  transition:
    "transform 300ms var(--ease-spring), box-shadow 300ms var(--ease-spring), border-color 300ms ease",
  ...(visible
    ? { animation: `fade-in-up 0.5s ease-out ${300 + i * 100}ms forwards` }
    : {}),
});

const frameClass = (accent: keyof typeof STRIPE_STYLES, layout: string) =>
  `group relative ${layout} rounded-2xl
   border-t-[3px] ${STRIPE_STYLES[accent]}
   bg-cream/80 dark:bg-night/60
   border border-cream-border/60 dark:border-night-border/60
   ${ACCENT_STYLES[accent].hoverBorder}
   hover:-translate-y-1 hover:shadow-card`;

// Clinical note + verification tick + defensibility score bars.
function DocDefendMotif() {
  return (
    <svg viewBox="0 0 260 84" className="w-full h-auto max-h-24" aria-hidden="true" focusable="false">
      <rect x="12" y="8" width="92" height="68" rx="4" fill="none" strokeWidth="1.5"
        className="stroke-sapphire dark:stroke-sapphire-dark draw-stroke" pathLength={100} />
      <g className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1.5" strokeLinecap="round">
        <line x1="22" y1="24" x2="94" y2="24" className="draw-stroke" pathLength={100} />
        <line x1="22" y1="36" x2="86" y2="36" className="draw-stroke" pathLength={100} />
        <line x1="22" y1="48" x2="94" y2="48" className="draw-stroke" pathLength={100} />
        <line x1="22" y1="60" x2="70" y2="60" className="draw-stroke" pathLength={100} />
      </g>
      <path d="M120 44 L134 58 L160 24" fill="none" strokeWidth="2.5" strokeLinecap="round"
        strokeLinejoin="round" className="stroke-peach dark:stroke-peach-dark draw-stroke" pathLength={100} />
      <g className="fill-sapphire dark:fill-sapphire-dark">
        <rect x="184" y="52" width="10" height="16" rx="1" className="spark-bar" style={{ transformBox: "fill-box" }} />
        <rect x="200" y="40" width="10" height="28" rx="1" className="spark-bar" style={{ transformBox: "fill-box" }} />
        <rect x="216" y="28" width="10" height="40" rx="1" className="spark-bar" style={{ transformBox: "fill-box" }} />
      </g>
      <line x1="180" y1="68" x2="240" y2="68" strokeWidth="1" className="stroke-ink-faint dark:stroke-night-border" />
    </svg>
  );
}

// Sustained-vowel waveform flowing into an ROC curve with an operating point.
// The chance diagonal is dashed and therefore deliberately NOT draw-stroke.
function ParkinsonsMotif() {
  return (
    <svg viewBox="0 0 260 84" className="w-full h-auto max-h-24" aria-hidden="true" focusable="false">
      <path d="M10 42 Q16 18 22 42 T34 42 T46 42 T58 42 T70 42 T82 42 T94 42 T106 42"
        fill="none" strokeWidth="1.5" className="stroke-mauve dark:stroke-mauve-dark draw-stroke" pathLength={100} />
      <path d="M140 10 L140 68 L244 68" fill="none" strokeWidth="1"
        className="stroke-ink-faint dark:stroke-night-border draw-stroke" pathLength={100} />
      <line x1="140" y1="68" x2="244" y2="10" strokeWidth="1" strokeDasharray="4 4"
        className="stroke-ink-faint dark:stroke-night-border" />
      <path d="M140 68 C150 30 170 16 244 12" fill="none" strokeWidth="2"
        className="stroke-peach dark:stroke-peach-dark draw-stroke" pathLength={100} />
      <circle cx="166" cy="24" r="3" className="fill-peach dark:fill-peach-dark" />
    </svg>
  );
}

const MOTIFS: Record<string, () => React.JSX.Element> = {
  "DocDefend+": DocDefendMotif,
  "Parkinson's Voice Screening": ParkinsonsMotif,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CardArrow({ external }: { external: boolean }) {
  return (
    <div className="absolute top-4 right-4 text-ink-faint/40 dark:text-night-muted/40
      group-hover:text-ink-muted dark:group-hover:text-night-muted
      transition-colors duration-200">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path
          fillRule="evenodd"
          d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

// Shared inner content for emphasized + standard tiers.
function CardBody({ project, emphasized, drawn }: { project: Project; emphasized: boolean; drawn: boolean }) {
  const s = ACCENT_STYLES[project.accent];
  const Motif = emphasized ? MOTIFS[project.name] : undefined;
  return (
    <>
      {Motif && (
        <div className={`mb-5 ${drawn ? "is-drawn" : ""}`}>
          <Motif />
        </div>
      )}
      <h3
        className={`${emphasized ? "text-xl sm:text-2xl" : "text-lg"} font-[family-name:var(--font-display)]
          text-ink dark:text-night-text mb-1 leading-tight`}
      >
        {project.name}
      </h3>
      <p className="text-sm font-[family-name:var(--font-badge)] italic text-ink-subtle dark:text-night-muted mb-1">
        {project.subtitle}
      </p>
      <p className="text-[12px] font-[family-name:var(--font-mono)] tracking-wide text-ink-subtle dark:text-night-muted mb-3">
        {project.provenance}
      </p>
      <p className="text-sm font-[family-name:var(--font-body)] text-ink dark:text-night-text/70 leading-relaxed mb-4 flex-1">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {project.pills.map((pill) => (
          <span
            key={pill}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1
              ${s.bg} border ${s.border}
              text-[12px] sm:text-[13px] tracking-wide font-[family-name:var(--font-badge)]
              ${s.text}`}
          >
            <span className={`w-1 h-1 rounded-full ${s.dot} shrink-0`} />
            {pill}
          </span>
        ))}
      </div>
      {project.url && <CardArrow external={!project.url.startsWith("/")} />}
    </>
  );
}

// Link/a/div shell — same three variants the flat grid used.
function CardShell({
  project,
  className,
  style,
  children,
}: {
  project: Project;
  className: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (project.url?.startsWith("/")) {
    return (
      <Link href={project.url} aria-label={`${project.name} — ${project.subtitle}`} className={className} style={style}>
        {children}
      </Link>
    );
  }
  if (project.url) {
    return (
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${project.name} — ${project.subtitle} (opens in new tab)`}
        className={className}
        style={style}
      >
        {children}
      </a>
    );
  }
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

// Tier 1 — full-width plate card. The dashboard screenshot is a mounted
// print: Latte-styled in both themes, framed by fixed reg marks at lg+.
function FeaturedCard({ project, visible }: { project: Project; visible: boolean }) {
  return (
    <CardShell
      project={project}
      className={frameClass(project.accent, "grid lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-10 items-center p-6 sm:p-8 mb-4 sm:mb-6")}
      style={entryStyle(visible, 0)}
    >
      <div className="flex flex-col">
        <CardBody project={project} emphasized={false} drawn={false} />
      </div>
      <div className="order-first lg:order-last relative lg:m-4">
        <div aria-hidden="true" className="absolute -inset-4 hidden lg:block">
          <span className="reg-mark top-0 left-0 border-t border-l" />
          <span className="reg-mark top-0 right-0 border-t border-r" />
          <span className="reg-mark bottom-0 left-0 border-b border-l" />
          <span className="reg-mark bottom-0 right-0 border-b border-r" />
        </div>
        <Image
          src="/work/spotify-plate.png"
          alt="KPI row and annotated monthly-hours line chart from the Spotify listening dashboard"
          width={1600}
          height={1325}
          sizes="(min-width: 1024px) 440px, (min-width: 640px) 60vw, 100vw"
          className="w-full h-auto rounded-xl border border-cream-border/60 dark:border-night-border/60"
        />
      </div>
    </CardShell>
  );
}

export function Projects() {
  const [sectionRef, visible] = useScrollReveal();

  const featured = projects.find((p) => p.tier === "featured")!;
  const emphasized = projects.filter((p) => p.tier === "emphasized");
  const standard = projects.filter((p) => p.tier === "standard");

  return (
    <section
      ref={sectionRef}
      aria-labelledby="section-02"
      className="relative py-20 sm:py-28 bg-cream-dark/50 dark:bg-night-card/40"
    >
      <SectionDivider />

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <SectionHeader
          number="02"
          label="Projects"
          title="Things I've Built"
          visible={visible}
          align="right"
          annotation={<>fig. 02 &middot; n = {projects.length} builds &middot; clinical ML to iOS</>}
          spark={{ data: [2, 4, 3, 5, 4, 6, 7], variant: "bars" }}
        />

        {/* Header-area link to the case-study index */}
        <div
          className="flex justify-center sm:justify-end -mt-6 mb-8"
          style={{
            opacity: 0,
            ...(visible ? { animation: "fade-in 0.6s ease-out 400ms forwards" } : {}),
          }}
        >
          <Link
            href="/work"
            className="inline-flex items-center gap-2 py-3 text-sm font-[family-name:var(--font-body)]
              text-ink-subtle dark:text-night-muted
              hover:text-ink dark:hover:text-night-text
              transition-colors duration-200"
          >
            all case studies
            <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        {/* Tier 1 — featured plate card */}
        <FeaturedCard project={featured} visible={visible} />

        {/* Tier 2 — emphasized pair with drawn motifs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {emphasized.map((project, i) => (
            <CardShell
              key={project.name}
              project={project}
              className={frameClass(project.accent, "flex flex-col p-6 sm:p-8")}
              style={entryStyle(visible, 1 + i)}
            >
              <CardBody project={project} emphasized={true} drawn={visible} />
            </CardShell>
          ))}
        </div>

        {/* Tier 3 — compact standard grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {standard.map((project, i) => (
            <CardShell
              key={project.name}
              project={project}
              className={frameClass(project.accent, "flex flex-col p-5")}
              style={entryStyle(visible, 3 + i)}
            >
              <CardBody project={project} emphasized={false} drawn={false} />
            </CardShell>
          ))}
        </div>
      </div>
    </section>
  );
}
