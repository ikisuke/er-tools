import { describe, expect, it } from "vitest";
import { centerOn, clampScale, fitView, MAX_SCALE, MIN_SCALE, wheelFactor, zoomAt } from "../src/zoom";

describe("zoomAt", () => {
  it("keeps the point under the cursor fixed", () => {
    const before = { scale: 1, x: 10, y: 20 };
    const after = zoomAt(before, 2, 110, 220);
    const diagramPoint = (v: typeof before) => [(110 - v.x) / v.scale, (220 - v.y) / v.scale];
    expect(after.scale).toBe(2);
    expect(diagramPoint(after)).toEqual(diagramPoint(before));
  });

  it("clamps the scale to the allowed range", () => {
    expect(zoomAt({ scale: 3, x: 0, y: 0 }, 10, 0, 0).scale).toBe(MAX_SCALE);
    expect(zoomAt({ scale: 0.2, x: 0, y: 0 }, 0.01, 0, 0).scale).toBe(MIN_SCALE);
    expect(clampScale(1.5)).toBe(1.5);
  });
});

describe("fitView", () => {
  it("shrinks a large diagram to fit and centers it", () => {
    const v = fitView({ width: 2000, height: 1000 }, { width: 1048, height: 600 }, 24);
    expect(v.scale).toBe(0.5);
    expect(v.x).toBe(24);
    expect(v.y).toBe(50);
  });

  it("does not enlarge a small diagram past 100%", () => {
    const v = fitView({ width: 200, height: 100 }, { width: 1000, height: 600 });
    expect(v).toEqual({ scale: 1, x: 400, y: 250 });
  });
});

describe("centerOn", () => {
  it("puts the given diagram point at the stage center", () => {
    const v = centerOn(300, 400, 2, { width: 800, height: 600 });
    expect(300 * v.scale + v.x).toBe(400);
    expect(400 * v.scale + v.y).toBe(300);
  });
});

describe("wheelFactor", () => {
  it("zooms in for upward scroll, out for downward, and caps large deltas", () => {
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(5000)).toBe(wheelFactor(100));
  });
});
