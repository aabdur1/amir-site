/**
 * Tests for lib/styles.ts — the shared ACCENT_STYLES map.
 *
 * The module exports exactly one runtime value (ACCENT_STYLES) plus the
 * type-only AccentColor alias (erased at runtime), so there are no other
 * style helpers to exercise.
 */
import { ACCENT_STYLES } from "@/lib/styles";

const EXPECTED_ACCENTS = ["lavender", "mauve", "peach", "rosewater", "sapphire"];
const EXPECTED_FIELDS = ["bg", "border", "dot", "hoverBorder", "text"];

describe("ACCENT_STYLES", () => {
  it("contains exactly the five documented accent keys", () => {
    expect(Object.keys(ACCENT_STYLES).sort()).toEqual(EXPECTED_ACCENTS);
  });

  it.each(EXPECTED_ACCENTS)("%s exposes exactly the bg/border/hoverBorder/dot/text fields", (accent) => {
    const entry = ACCENT_STYLES[accent as keyof typeof ACCENT_STYLES];
    expect(Object.keys(entry).sort()).toEqual(EXPECTED_FIELDS);
  });

  it.each(EXPECTED_ACCENTS)("%s has non-empty class strings for every field", (accent) => {
    const entry = ACCENT_STYLES[accent as keyof typeof ACCENT_STYLES];
    for (const field of EXPECTED_FIELDS) {
      const value = entry[field as keyof typeof entry];
      expect(typeof value).toBe("string");
      expect(value.trim().length).toBeGreaterThan(0);
      // No accidental leading/trailing whitespace baked into the class list.
      expect(value).toBe(value.trim());
    }
  });

  it.each(EXPECTED_ACCENTS)(
    "%s accent-scoped fields reference the accent in both light and dark variants",
    (accent) => {
      const entry = ACCENT_STYLES[accent as keyof typeof ACCENT_STYLES];
      // bg / border / hoverBorder / dot are accent-tinted; text is the shared
      // ink color and intentionally does not mention the accent.
      for (const field of ["bg", "border", "hoverBorder", "dot"] as const) {
        expect(entry[field]).toContain(accent);
        expect(entry[field]).toContain(`${accent}-dark`);
        expect(entry[field]).toContain("dark:");
      }
    }
  );

  it.each(EXPECTED_ACCENTS)("%s hoverBorder classes are all hover-gated", (accent) => {
    const entry = ACCENT_STYLES[accent as keyof typeof ACCENT_STYLES];
    for (const token of entry.hoverBorder.split(/\s+/)) {
      expect(token).toContain("hover:");
    }
  });

  it.each(EXPECTED_ACCENTS)("%s text uses the shared ink color with a dark-mode variant", (accent) => {
    const entry = ACCENT_STYLES[accent as keyof typeof ACCENT_STYLES];
    expect(entry.text).toMatch(/^text-/);
    expect(entry.text).toContain("dark:");
  });

  it("dot classes carry no opacity modifier (solid accent dots)", () => {
    for (const accent of EXPECTED_ACCENTS) {
      const { dot } = ACCENT_STYLES[accent as keyof typeof ACCENT_STYLES];
      expect(dot).not.toContain("/");
    }
  });

  it("is the module's only runtime export (AccentColor is type-only)", async () => {
    const mod = await import("@/lib/styles");
    expect(Object.keys(mod).sort()).toEqual(["ACCENT_STYLES"]);
  });
});
