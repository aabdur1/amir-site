/** Unified badge type used across the site */
export interface Badge {
  name: string;
  shortName: string;
  img: string;
  org: string;
  date: string;
  url: string;
}

interface CredlyBadge {
  id: string;
  issued_at_date: string;
  badge_template: {
    name: string;
    image_url: string;
  };
  issuer: {
    entities: Array<{
      entity: { name: string };
    }>;
  };
}

interface CredlyResponse {
  data: CredlyBadge[];
}

/** Manual badges not on Credly (e.g. Zscaler, Snowflake) */
const manualBadges: Badge[] = [
  {
    name: "Zscaler Zero Trust Certified Architect",
    shortName: "Zero Trust Architect",
    img: "/badges/zscaler-ztca.jpeg",
    org: "Zscaler",
    date: "2025-06",
    url: "https://www.zscaler.com/education-and-certification",
  },
  {
    name: "SnowPro Associate: Platform Certification",
    shortName: "SnowPro Associate",
    img: "/badges/snowflake-snowpro-core.png",
    org: "Snowflake",
    date: "2026-03",
    url: "https://achieve.snowflake.com/b5d33342-5619-46ea-97ef-ca514f99cdb2#acc.9vlsqPTz",
  },
];

const CREDLY_USER = "amir-abdur-rahim";

/** Strip common suffixes/prefixes from Credly badge names */
function deriveShortName(fullName: string): string {
  return fullName
    .replace(/ - Training Badge$/i, "")
    .replace(/ Skill Badge$/i, "")
    .replace(/^AWS Academy Graduate - /, "")
    .replace(/^AWS Cloud Quest: /, "")
    .replace(/^Derive Insights from /, "")
    .replace(/^Build /, "")
    .replace(/^Analyze and Visualize /, "")
    .replace(/^Get Started with /, "");
}

/** Derive a short org name from Credly issuer */
function deriveOrg(issuerName: string): string {
  if (!issuerName) return "Unknown";
  if (issuerName.includes("Amazon Web Services")) return "AWS";
  if (issuerName.includes("Google Cloud")) return "Google Cloud";
  return issuerName.split(" ").slice(0, 2).join(" ");
}

/** Fetch badges from Credly API */
async function fetchCredlyBadges(): Promise<Badge[]> {
  try {
    const res = await fetch(
      `https://www.credly.com/users/${CREDLY_USER}/badges.json`,
      { next: { revalidate: 86400 } } // revalidate daily
    );

    if (!res.ok) {
      console.warn(`Credly API returned ${res.status}, using fallback`);
      return [];
    }

    const json: CredlyResponse = await res.json();

    return json.data.map((badge) => ({
      name: badge.badge_template.name
        .replace(/ - Training Badge$/i, "")
        .replace(/ Skill Badge$/i, ""),
      shortName: deriveShortName(badge.badge_template.name),
      img: badge.badge_template.image_url,
      org: deriveOrg(badge.issuer.entities[0]?.entity.name ?? ""),
      date: badge.issued_at_date.slice(0, 7), // "2025-11-24" → "2025-11"
      url: `https://www.credly.com/badges/${badge.id}`,
    }));
  } catch (err) {
    console.warn("Failed to fetch Credly badges:", err);
    return [];
  }
}

/** Get all badges — Credly + manual, sorted newest first */
export async function getAllBadges(): Promise<Badge[]> {
  const credlyBadges = await fetchCredlyBadges();
  const all = [...credlyBadges, ...manualBadges];
  return all.sort((a, b) => b.date.localeCompare(a.date));
}
