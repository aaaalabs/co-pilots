// Pure collision helpers. No state, no side effects.

export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const distSq = dx * dx + dy * dy;
  const sumR = ar + br;
  return distSq <= sumR * sumR;
}

export function pointInCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  cr: number,
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= cr * cr;
}
