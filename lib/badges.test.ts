import { getAllBadges, badgeGroup, type Badge } from "@/lib/badges";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const CREDLY_URL = "https://www.credly.com/users/amir-abdur-rahim/badges.json";

const MANUAL_NAMES = [
  "Building with the Claude API",
  "Zscaler Zero Trust Certified Architect",
  "SnowPro Associate: Platform Certification",
  "SANS AWS Skills to Jobs CTF — Top 20 Regional",
];

/** Minimal well-formed Credly badge payload entry */
function credlyEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    issued_at_date: "2026-01-15",
    badge_template: {
      name: "Some Credly Badge",
      image_url: "https://images.credly.com/images/abc/some-badge.png",
    },
    issuer: {
      entities: [{ entity: { name: "Some Issuer Organization Inc" } }],
    },
    ...overrides,
  };
}

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

function stubFetch(impl: (...args: unknown[]) => unknown) {
  const mock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** Convenience: badge shell for badgeGroup (only `name` is consulted) */
function namedBadge(name: string, shortName = name): Badge {
  return {
    name,
    shortName,
    img: "/x.png",
    org: "Org",
    date: "2026-01",
    url: "https://example.com",
  };
}

/* ------------------------------------------------------------------ */
/* Suite                                                               */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  // Silence the module's console.warn fallback logging in failure tests
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("badgeGroup()", () => {
  it.each([
    "Looker Business Analyst",
    "LookML Developer",
    "Derive Insights from BigQuery",
    "SnowPro Associate: Platform Certification",
    "Data Analytics Essentials",
  ])('classifies "%s" as "data"', (name) => {
    expect(badgeGroup(namedBadge(name))).toBe("data");
  });

  it("matches keywords case-insensitively", () => {
    expect(badgeGroup(namedBadge("BIGQUERY FUNDAMENTALS"))).toBe("data");
    expect(badgeGroup(namedBadge("looker studio basics"))).toBe("data");
  });

  it.each([
    "Zscaler Zero Trust Certified Architect",
    "AWS Cloud Quest: Cloud Practitioner",
    "SANS AWS Skills to Jobs CTF — Top 20 Regional",
    "Building with the Claude API",
  ])('classifies "%s" as "cloud"', (name) => {
    expect(badgeGroup(namedBadge(name))).toBe("cloud");
  });

  it("classifies on the full name, not the shortName", () => {
    // name has no data keyword, shortName does — must still be "cloud"
    expect(badgeGroup(namedBadge("Cloud Security Engineer", "Data Wizard"))).toBe(
      "cloud"
    );
  });

  it("matches keyword substrings anywhere in the name (current behavior)", () => {
    // "snow" and "data" are substring matches — e.g. a hypothetical
    // "Database Administrator" badge lands in "data" via the "data" keyword.
    expect(badgeGroup(namedBadge("Database Administrator"))).toBe("data");
  });
});

describe("getAllBadges() — successful Credly fetch", () => {
  it("fetches the Credly badges.json for amir-abdur-rahim with an abort signal", async () => {
    const mock = stubFetch(async () => okResponse({ data: [] }));
    await getAllBadges();

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(
      CREDLY_URL,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("parses a well-formed response, merges with manual badges, and sorts newest-first", async () => {
    stubFetch(async () =>
      okResponse({
        data: [
          credlyEntry({ id: "old-badge", issued_at_date: "2024-01-15" }),
          credlyEntry({
            id: "new-badge",
            issued_at_date: "2026-07-01",
            badge_template: {
              name: "Newest Credly Badge",
              image_url: "https://images.credly.com/new.png",
            },
          }),
        ],
      })
    );

    const badges = await getAllBadges();

    // 2 credly + 4 manual
    expect(badges).toHaveLength(6);

    // Newest first: 2026-07 credly, 2026-05 Anthropic, 2026-03 x2, 2025-06, 2024-01 credly
    expect(badges.map((b) => b.date)).toEqual([
      "2026-07",
      "2026-05",
      "2026-03",
      "2026-03",
      "2025-06",
      "2024-01",
    ]);
    expect(badges[0].name).toBe("Newest Credly Badge");
    expect(badges[badges.length - 1].url).toBe(
      "https://www.credly.com/badges/old-badge"
    );

    // The sort is genuinely descending
    const dates = badges.map((b) => b.date);
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
  });

  it("constructs the badge URL from the Credly id — never taken raw from the payload", async () => {
    stubFetch(async () =>
      okResponse({
        data: [
          credlyEntry({
            id: "my-badge-id",
            // decoy fields that must NOT leak into the constructed url
            url: "https://evil.example.com/phish",
            badge_url: "https://evil.example.com/phish2",
          }),
        ],
      })
    );

    const badges = await getAllBadges();
    const credly = badges.find((b) => b.url.includes("my-badge-id"));

    expect(credly).toBeDefined();
    expect(credly!.url).toBe("https://www.credly.com/badges/my-badge-id");
    expect(badges.some((b) => b.url.includes("evil.example.com"))).toBe(false);
  });

  it("strips ' - Training Badge' / ' Skill Badge' suffixes from name and derives shortName", async () => {
    stubFetch(async () =>
      okResponse({
        data: [
          credlyEntry({
            id: "a",
            badge_template: {
              name: "Derive Insights from BigQuery - Training Badge",
              image_url: "https://images.credly.com/a.png",
            },
          }),
          credlyEntry({
            id: "b",
            badge_template: {
              name: "Build Infrastructure with Terraform Skill Badge",
              image_url: "https://images.credly.com/b.png",
            },
          }),
          credlyEntry({
            id: "c",
            badge_template: {
              name: "AWS Academy Graduate - AWS Academy Cloud Foundations",
              image_url: "https://images.credly.com/c.png",
            },
          }),
        ],
      })
    );

    const badges = await getAllBadges();
    const byUrl = (id: string) =>
      badges.find((b) => b.url === `https://www.credly.com/badges/${id}`)!;

    expect(byUrl("a").name).toBe("Derive Insights from BigQuery");
    expect(byUrl("a").shortName).toBe("BigQuery");

    expect(byUrl("b").name).toBe("Build Infrastructure with Terraform");
    expect(byUrl("b").shortName).toBe("Infrastructure with Terraform");

    // Prefix stripping applies only to shortName, not name
    expect(byUrl("c").name).toBe(
      "AWS Academy Graduate - AWS Academy Cloud Foundations"
    );
    expect(byUrl("c").shortName).toBe("AWS Academy Cloud Foundations");
  });

  it("derives org: AWS / Google Cloud aliases, two-word truncation, Unknown fallback", async () => {
    const issuer = (name: string) => ({ entities: [{ entity: { name } }] });
    stubFetch(async () =>
      okResponse({
        data: [
          credlyEntry({
            id: "aws",
            issuer: issuer("Amazon Web Services Training and Certification"),
          }),
          credlyEntry({ id: "gcp", issuer: issuer("Google Cloud") }),
          credlyEntry({
            id: "long",
            issuer: issuer("Cisco Networking Academy Global"),
          }),
          credlyEntry({ id: "none", issuer: undefined }),
        ],
      })
    );

    const badges = await getAllBadges();
    const byUrl = (id: string) =>
      badges.find((b) => b.url === `https://www.credly.com/badges/${id}`)!;

    expect(byUrl("aws").org).toBe("AWS");
    expect(byUrl("gcp").org).toBe("Google Cloud");
    expect(byUrl("long").org).toBe("Cisco Networking"); // first two words
    expect(byUrl("none").org).toBe("Unknown");
  });

  it("truncates issued_at_date to YYYY-MM", async () => {
    stubFetch(async () =>
      okResponse({ data: [credlyEntry({ id: "d", issued_at_date: "2025-11-30" })] })
    );

    const badges = await getAllBadges();
    const credly = badges.find(
      (b) => b.url === "https://www.credly.com/badges/d"
    )!;
    expect(credly.date).toBe("2025-11");
  });

  it('missing issued_at_date becomes "unknown" and sorts to the BOTTOM', async () => {
    stubFetch(async () =>
      okResponse({ data: [credlyEntry({ id: "nodate", issued_at_date: undefined })] })
    );

    const badges = await getAllBadges();
    // An undated badge must never lead the newest-first list — it sorts last.
    const last = badges[badges.length - 1];
    expect(last.date).toBe("unknown");
    expect(last.url).toBe("https://www.credly.com/badges/nodate");

    // Real dates ahead of it stay genuinely descending
    const dated = badges.slice(0, -1).map((b) => b.date);
    expect(dated).toEqual([...dated].sort((a, b) => b.localeCompare(a)));
  });
});

describe("getAllBadges() — malformed entries are filtered out", () => {
  it("drops entries missing id, with non-string id, or missing template name/image", async () => {
    stubFetch(async () =>
      okResponse({
        data: [
          credlyEntry({ id: "keep-me" }),
          credlyEntry({ id: undefined }), // no id
          credlyEntry({ id: 12345 }), // non-string id
          credlyEntry({
            id: "no-name",
            badge_template: { image_url: "https://images.credly.com/x.png" },
          }), // missing name
          credlyEntry({
            id: "no-img",
            badge_template: { name: "Has Name Only" },
          }), // missing image_url
          credlyEntry({ id: "no-template", badge_template: undefined }),
          null, // null entry
        ],
      })
    );

    const badges = await getAllBadges();
    const credlyBadges = badges.filter((b) =>
      b.url.startsWith("https://www.credly.com/badges/")
    );

    expect(credlyBadges).toHaveLength(1);
    expect(credlyBadges[0].url).toBe("https://www.credly.com/badges/keep-me");

    // None of the malformed entries survived
    expect(badges.some((b) => b.url.includes("no-name"))).toBe(false);
    expect(badges.some((b) => b.url.includes("no-img"))).toBe(false);
    expect(badges.some((b) => b.url.includes("no-template"))).toBe(false);
    expect(badges.some((b) => b.url.includes("12345"))).toBe(false);

    // Manual badges unaffected
    expect(badges).toHaveLength(1 + MANUAL_NAMES.length);
  });
});

describe("getAllBadges() — failure handling (never throws, manual badges survive)", () => {
  const expectManualOnlySortedNewestFirst = (badges: Badge[]) => {
    expect(badges).toHaveLength(MANUAL_NAMES.length);
    // Descending by date; ties keep insertion order (stable sort)
    expect(badges.map((b) => b.name)).toEqual([
      "Building with the Claude API", // 2026-05
      "SnowPro Associate: Platform Certification", // 2026-03
      "SANS AWS Skills to Jobs CTF — Top 20 Regional", // 2026-03
      "Zscaler Zero Trust Certified Architect", // 2025-06
    ]);
  };

  it("returns only manual badges on a non-ok response", async () => {
    stubFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));

    const badges = await getAllBadges();
    expectManualOnlySortedNewestFirst(badges);
    expect(console.warn).toHaveBeenCalled();
  });

  it("returns only manual badges when fetch rejects (network error)", async () => {
    stubFetch(async () => {
      throw new TypeError("network down");
    });

    await expect(getAllBadges()).resolves.toBeDefined();
    const badges = await getAllBadges();
    expectManualOnlySortedNewestFirst(badges);
  });

  it("returns only manual badges when res.json() throws (invalid JSON)", async () => {
    stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    }));

    const badges = await getAllBadges();
    expectManualOnlySortedNewestFirst(badges);
  });

  it("returns only manual badges when the response shape is wrong (data not an array)", async () => {
    stubFetch(async () => okResponse({ data: "not-an-array" }));
    expectManualOnlySortedNewestFirst(await getAllBadges());

    stubFetch(async () => okResponse(null));
    expectManualOnlySortedNewestFirst(await getAllBadges());
  });

  it("aborts a hung fetch after the 5s timeout and falls back to manual badges", async () => {
    vi.useFakeTimers();

    stubFetch(
      (_url: unknown, init: unknown) =>
        new Promise((_resolve, reject) => {
          const { signal } = init as { signal: AbortSignal };
          signal.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError"))
          );
        })
    );

    const pending = getAllBadges();
    await vi.advanceTimersByTimeAsync(5000);
    const badges = await pending;

    expectManualOnlySortedNewestFirst(badges);
    expect(console.warn).toHaveBeenCalled();
  });

  it("manual badges (Zscaler / SnowPro / SANS / Anthropic) are always present, success or failure", async () => {
    // Failure path
    stubFetch(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    const onFailure = await getAllBadges();
    for (const name of MANUAL_NAMES) {
      expect(onFailure.map((b) => b.name)).toContain(name);
    }

    // Success path
    stubFetch(async () => okResponse({ data: [credlyEntry()] }));
    const onSuccess = await getAllBadges();
    for (const name of MANUAL_NAMES) {
      expect(onSuccess.map((b) => b.name)).toContain(name);
    }
  });
});
