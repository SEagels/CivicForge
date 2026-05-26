export interface GraphViewport {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface GraphZoomInput {
  readonly anchorX: number;
  readonly anchorY: number;
  readonly deltaY: number;
}

export interface GraphPanInput {
  readonly deltaX: number;
  readonly deltaY: number;
}

export const DEFAULT_GRAPH_VIEWPORT: GraphViewport = {
  scale: 1,
  x: 0,
  y: 0,
};

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.4;

export function applyGraphZoom(viewport: GraphViewport, input: GraphZoomInput): GraphViewport {
  const zoomFactor = Math.exp(-input.deltaY * 0.0018);
  const nextScale = clampScale(viewport.scale * zoomFactor);
  const graphX = (input.anchorX - viewport.x) / viewport.scale;
  const graphY = (input.anchorY - viewport.y) / viewport.scale;

  return {
    scale: nextScale,
    x: input.anchorX - graphX * nextScale,
    y: input.anchorY - graphY * nextScale,
  };
}

export function applyGraphPan(viewport: GraphViewport, input: GraphPanInput): GraphViewport {
  return {
    scale: viewport.scale,
    x: viewport.x + input.deltaX,
    y: viewport.y + input.deltaY,
  };
}

function clampScale(value: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, roundScale(value)));
}

function roundScale(value: number): number {
  return Math.round(value * 100) / 100;
}
