import { describe, expect, it } from "vitest";
import { applyGraphPan, applyGraphZoom, DEFAULT_GRAPH_VIEWPORT } from "./graphViewport";

describe("graph viewport", () => {
  it("clamps zoom level while keeping the pointer anchor stable", () => {
    const zoomedIn = applyGraphZoom(DEFAULT_GRAPH_VIEWPORT, {
      anchorX: 300,
      anchorY: 260,
      deltaY: -600,
    });

    expect(zoomedIn.scale).toBe(2.4);
    expect(zoomedIn.x).toBe(-420);
    expect(zoomedIn.y).toBe(-364);

    const zoomedOut = applyGraphZoom(zoomedIn, {
      anchorX: 300,
      anchorY: 260,
      deltaY: 800,
    });

    expect(zoomedOut.scale).toBe(0.6);
  });

  it("applies panning deltas without changing scale", () => {
    expect(applyGraphPan({ scale: 1.6, x: 10, y: -20 }, { deltaX: 32, deltaY: -14 })).toEqual({
      scale: 1.6,
      x: 42,
      y: -34,
    });
  });
});
