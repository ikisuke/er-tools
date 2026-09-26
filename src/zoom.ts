export interface View {
  scale: number;
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;
export const STEP = 1.25;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Scales by `factor` while keeping the stage point (`px`, `py`) over the same diagram point. */
export function zoomAt(view: View, factor: number, px: number, py: number): View {
  const scale = clampScale(view.scale * factor);
  const k = scale / view.scale;
  return { scale, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/** Fits the whole diagram in the stage and centers it, never enlarging past 100%. */
export function fitView(content: Size, stage: Size, padding = 24): View {
  if (content.width <= 0 || content.height <= 0) return { scale: 1, x: 0, y: 0 };
  const scale = clampScale(
    Math.min(1, (stage.width - padding * 2) / content.width, (stage.height - padding * 2) / content.height),
  );
  return {
    scale,
    x: (stage.width - content.width * scale) / 2,
    y: (stage.height - content.height * scale) / 2,
  };
}

/** Places the diagram point (`cx`, `cy`) at the center of the stage at the given scale. */
export function centerOn(cx: number, cy: number, scale: number, stage: Size): View {
  const s = clampScale(scale);
  return { scale: s, x: stage.width / 2 - cx * s, y: stage.height / 2 - cy * s };
}

/** Converts a wheel delta (pixels) to a zoom factor; larger deltas zoom more, capped per event. */
export function wheelFactor(deltaY: number): number {
  const d = Math.max(-100, Math.min(100, deltaY));
  return Math.exp(-d * 0.002);
}
