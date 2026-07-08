/**
 * Tests for lib/hooks.ts — useHydrated, useScrollReveal, useMagnetic.
 *
 * Globals mocked:
 * - IntersectionObserver: jsdom provides none, so a capturing mock class is
 *   stubbed on the global (records callback, options, observed elements, and
 *   disconnect calls, and lets tests fire entries manually).
 * - window.matchMedia: stubbed per-test so the `(pointer: fine)` gate in
 *   useMagnetic can be flipped deterministically.
 * - requestAnimationFrame / cancelAnimationFrame: replaced with a manual
 *   frame queue so the useMagnetic lerp loop is stepped frame-by-frame with
 *   no real timing involved.
 *
 * All stubs are removed in afterEach via vi.unstubAllGlobals().
 */
import { createElement } from "react";
import type { RefObject } from "react";
import { act, render, renderHook } from "@testing-library/react";
import { useHydrated, useMagnetic, useScrollReveal } from "@/lib/hooks";

/* ------------------------------------------------------------------ */
/* Shared mocks                                                        */
/* ------------------------------------------------------------------ */

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly callback: IntersectionObserverCallback;
  readonly options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
  disconnectCount = 0;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }

  unobserve(el: Element) {
    this.observed = this.observed.filter((e) => e !== el);
  }

  disconnect() {
    this.disconnectCount += 1;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Fire the captured callback with a single synthetic entry. */
  trigger(isIntersecting: boolean) {
    const target = this.observed[0];
    const entry = { isIntersecting, target } as unknown as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

function stubIntersectionObserver() {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal(
    "IntersectionObserver",
    MockIntersectionObserver as unknown as typeof IntersectionObserver
  );
}

function stubMatchMedia(matches: boolean) {
  const mql = {
    matches,
    media: "(pointer: fine)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  const matchMedia = vi.fn().mockReturnValue(mql);
  vi.stubGlobal("matchMedia", matchMedia);
  return matchMedia;
}

/** Replace rAF with a manual queue so animation frames run only when asked. */
function stubRaf() {
  const queue: FrameRequestCallback[] = [];
  let nextId = 1;
  const cancelSpy = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    queue.push(cb);
    return nextId++;
  });
  vi.stubGlobal("cancelAnimationFrame", cancelSpy);

  const flushFrame = () => {
    // Snapshot, so callbacks scheduling the next frame land in the queue
    // for the NEXT flush (one flush == one animation frame).
    const cbs = queue.splice(0, queue.length);
    for (const cb of cbs) cb(0);
  };
  const flushAll = (maxFrames = 500) => {
    let frames = 0;
    while (queue.length > 0 && frames < maxFrames) {
      flushFrame();
      frames += 1;
    }
    return frames;
  };
  return { queue, flushFrame, flushAll, cancelSpy };
}

function parseTranslate(transform: string): { x: number; y: number } {
  const m = transform.match(/^translate\((-?[\d.eE+-]+)px, (-?[\d.eE+-]+)px\)$/);
  if (!m) throw new Error(`unexpected transform: "${transform}"`);
  return { x: Number(m[1]), y: Number(m[2]) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/* useHydrated                                                         */
/* ------------------------------------------------------------------ */

describe("useHydrated", () => {
  it("returns true once rendered on the client", () => {
    // Testing Library client-renders (createRoot, not hydrateRoot), so
    // useSyncExternalStore reads the client getSnapshot (() => true) on the
    // very first render. The server snapshot (() => false) is only ever
    // consulted during SSR / hydration render — which never happens under
    // this jsdom test harness. Hence: true immediately after render.
    const { result } = renderHook(() => useHydrated());
    expect(result.current).toBe(true);
  });

  it("stays true across re-renders (subscribe is a no-op store)", () => {
    const { result, rerender } = renderHook(() => useHydrated());
    rerender();
    expect(result.current).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* useScrollReveal                                                     */
/* ------------------------------------------------------------------ */

// Probe components: the hook's effect reads ref.current, so the ref must be
// attached to a real DOM node before effects run — renderHook alone can't do
// that, a rendered component can. (createElement instead of JSX keeps this a .ts file.)
function RevealProbe() {
  const [ref, visible] = useScrollReveal();
  return createElement("div", {
    ref: ref as unknown as RefObject<HTMLDivElement>,
    "data-testid": "reveal-target",
    "data-visible": String(visible),
  });
}

function RevealProbeWithThreshold({ threshold }: { threshold: number }) {
  const [ref, visible] = useScrollReveal(threshold);
  return createElement("div", {
    ref: ref as unknown as RefObject<HTMLDivElement>,
    "data-testid": "reveal-target",
    "data-visible": String(visible),
  });
}

describe("useScrollReveal", () => {
  beforeEach(() => {
    stubIntersectionObserver();
  });

  it("observes the ref'd element with the default threshold of 0.1", () => {
    const { container } = render(createElement(RevealProbe));
    const target = container.querySelector('[data-testid="reveal-target"]')!;

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const observer = MockIntersectionObserver.instances[0];
    expect(observer.observed).toEqual([target]);
    expect(observer.options).toEqual({ threshold: 0.1 });
    // Not visible until an intersection fires.
    expect(target.getAttribute("data-visible")).toBe("false");
  });

  it("passes a custom threshold through to the observer options", () => {
    render(createElement(RevealProbeWithThreshold, { threshold: 0.5 }));
    expect(MockIntersectionObserver.instances[0].options).toEqual({ threshold: 0.5 });
  });

  it("flips visible to true on the first intersecting entry and disconnects", () => {
    const { container } = render(createElement(RevealProbe));
    const target = container.querySelector('[data-testid="reveal-target"]')!;
    const observer = MockIntersectionObserver.instances[0];

    act(() => {
      observer.trigger(true);
    });

    expect(target.getAttribute("data-visible")).toBe("true");
    // Disconnect-after-first-intersection: exactly one disconnect while
    // still mounted (the effect cleanup would add a second on unmount).
    expect(observer.disconnectCount).toBe(1);
  });

  it("ignores non-intersecting entries (stays hidden, keeps observing)", () => {
    const { container } = render(createElement(RevealProbe));
    const target = container.querySelector('[data-testid="reveal-target"]')!;
    const observer = MockIntersectionObserver.instances[0];

    act(() => {
      observer.trigger(false);
    });

    expect(target.getAttribute("data-visible")).toBe("false");
    expect(observer.disconnectCount).toBe(0);
  });

  it("disconnects on unmount even if no intersection ever fired", () => {
    const { unmount } = render(createElement(RevealProbe));
    const observer = MockIntersectionObserver.instances[0];
    expect(observer.disconnectCount).toBe(0);

    unmount();
    expect(observer.disconnectCount).toBe(1);
  });

  it("creates no observer when the ref is never attached to an element", () => {
    // Bare renderHook never attaches the ref, so the `if (!el) return` guard
    // short-circuits the effect.
    const { result } = renderHook(() => useScrollReveal());
    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(result.current[0].current).toBeNull();
    expect(result.current[1]).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* useMagnetic                                                         */
/* ------------------------------------------------------------------ */

// Note on API shape: useMagnetic does NOT return a ref — it *accepts* one
// (RefObject<HTMLElement | null>) and returns void, attaching listeners to
// ref.current as a side effect.
//
// Deterministic coverage only: the lerp math is exercised by stepping a
// mocked rAF queue by hand, so no assertion here depends on real frame
// timing. One behavior intentionally NOT asserted: the exact easing curve
// shape over wall-clock time (meaningless under a mocked rAF).

const RECT = {
  left: 0,
  top: 0,
  right: 100,
  bottom: 100,
  width: 100,
  height: 100,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

function makeMagneticTarget(): HTMLElement {
  const el = document.createElement("button");
  el.getBoundingClientRect = () => RECT;
  return el;
}

describe("useMagnetic", () => {
  it("queries (pointer: fine) and attaches mousemove/mouseleave listeners when it matches", () => {
    const matchMedia = stubMatchMedia(true);
    const el = makeMagneticTarget();
    const addSpy = vi.spyOn(el, "addEventListener");

    const { result } = renderHook(() => useMagnetic({ current: el }));

    expect(matchMedia).toHaveBeenCalledWith("(pointer: fine)");
    expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("mouseleave", expect.any(Function));
    // The hook is void — it takes the ref as an argument, returns nothing.
    expect(result.current).toBeUndefined();
  });

  it("attaches no listeners on coarse pointers ((pointer: fine) is false)", () => {
    stubMatchMedia(false);
    const el = makeMagneticTarget();
    const addSpy = vi.spyOn(el, "addEventListener");

    renderHook(() => useMagnetic({ current: el }));

    expect(addSpy).not.toHaveBeenCalled();
  });

  it("is inert when the ref holds no element (bails before even querying matchMedia)", () => {
    const matchMedia = stubMatchMedia(true);

    renderHook(() => useMagnetic({ current: null }));

    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("lerps toward the cursor on mousemove and stops the RAF loop once converged", () => {
    stubMatchMedia(true);
    const raf = stubRaf();
    const el = makeMagneticTarget();
    renderHook(() => useMagnetic({ current: el }));

    // Element center is (50, 50); cursor at (60, 50):
    //   dx = 10, dist = 10, maxDist = 100, factor = 1 - 10/100 = 0.9
    //   targetX = 10 * 0.9 * (4/100 * 2) = 0.72, targetY = 0
    el.dispatchEvent(new MouseEvent("mousemove", { clientX: 60, clientY: 50 }));
    expect(raf.queue).toHaveLength(1);

    // First frame: one lerp step of 0.15 toward the target.
    raf.flushFrame();
    const firstStep = parseTranslate(el.style.transform);
    expect(firstStep.x).toBeCloseTo(0.72 * 0.15, 5);
    expect(firstStep.y).toBeCloseTo(0, 5);
    // Not converged yet — another frame was scheduled.
    expect(raf.queue).toHaveLength(1);

    // Drive frames until convergence; the loop must terminate on its own
    // (convergence check snaps to the target and stops re-scheduling).
    const frames = raf.flushAll();
    expect(frames).toBeLessThan(500);
    expect(raf.queue).toHaveLength(0);

    const settled = parseTranslate(el.style.transform);
    expect(settled.x).toBeCloseTo(0.72, 5);
    expect(settled.y).toBeCloseTo(0, 5);
    // Displacement stays within the documented 4px clamp.
    expect(Math.abs(settled.x)).toBeLessThanOrEqual(4);
  });

  it("returns to origin on mouseleave in a single already-converged frame", () => {
    stubMatchMedia(true);
    const raf = stubRaf();
    const el = makeMagneticTarget();
    renderHook(() => useMagnetic({ current: el }));

    // No prior movement: target and current are both 0, so the first frame
    // takes the convergence branch, snaps to the exact target, and does not
    // schedule another frame.
    el.dispatchEvent(new MouseEvent("mouseleave"));
    expect(raf.queue).toHaveLength(1);

    raf.flushFrame();
    expect(el.style.transform).toBe("translate(0px, 0px)");
    expect(raf.queue).toHaveLength(0);
  });

  it("removes listeners, cancels any pending frame, and clears the transform on unmount", () => {
    stubMatchMedia(true);
    const raf = stubRaf();
    const el = makeMagneticTarget();
    const removeSpy = vi.spyOn(el, "removeEventListener");

    const { unmount } = renderHook(() => useMagnetic({ current: el }));

    // Leave a frame pending and a transform applied, then unmount mid-flight.
    el.dispatchEvent(new MouseEvent("mousemove", { clientX: 60, clientY: 50 }));
    raf.flushFrame();
    expect(el.style.transform).not.toBe("");
    expect(raf.queue).toHaveLength(1); // still animating

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("mouseleave", expect.any(Function));
    expect(raf.cancelSpy).toHaveBeenCalledTimes(1);
    expect(el.style.transform).toBe("");
  });
});
