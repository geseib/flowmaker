import { MAX_LABEL_W } from './constants.js';

// Shared by both arrangements. They live in one module because the build
// concatenates every module into a single scope, where two top-level
// declarations of the same name collide.

export const round = (n) => Math.round(n * 100) / 100;

// Headless text measurement. Deliberately crude and deterministic: the renderer
// re-measures with the real font in the browser and re-runs layout, so this only
// needs to be close enough for tests and for first paint. A <br> is a deliberate
// break, so it always starts a new line.
export function estimateTextSize(label, { fontSize, padX, padY, minNodeW, nodeH }) {
  const charW = fontSize * 0.58;
  const maxTextW = MAX_LABEL_W - padX * 2;
  let lines = 0;
  let widest = 0;
  for (const segment of String(label).split(/<br\s*\/?>/i)) {
    const w = segment.length * charW;
    widest = Math.max(widest, Math.min(w, maxTextW));
    lines += Math.max(1, Math.ceil(w / maxTextW));
  }
  return {
    w: Math.round(Math.min(MAX_LABEL_W, Math.max(minNodeW, widest + padX * 2))),
    h: Math.round(Math.max(nodeH, Math.max(1, lines) * fontSize * 1.35 + padY * 2)),
  };
}

// An orthogonal run through the given points, with the corners eased off.
export function roundedPath(points, radius) {
  if (points.length < 2) return '';
  let d = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y) || 1;
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y) || 1;
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const a = { x: cur.x - ((cur.x - prev.x) / inLen) * r, y: cur.y - ((cur.y - prev.y) / inLen) * r };
    const b = { x: cur.x + ((next.x - cur.x) / outLen) * r, y: cur.y + ((next.y - cur.y) / outLen) * r };
    d += ` L ${round(a.x)} ${round(a.y)} Q ${round(cur.x)} ${round(cur.y)} ${round(b.x)} ${round(b.y)}`;
  }
  const last = points.at(-1);
  d += ` L ${round(last.x)} ${round(last.y)}`;
  return d;
}
