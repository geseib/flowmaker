import { DENSITY } from './constants.js';
import { esc } from './escape.js';

// A plain rendering of the same graph in mermaid's default look, to sit beside
// the styled version as a baseline.
//
// This is FlowMaker's own layout drawn in mermaid's default theme, not output
// from mermaid.js. Bundling mermaid would cost roughly a megabyte and break
// both the zero-dependency rule and the self-contained export, so the diagram
// is a faithful visual match rather than the real library's rendering; node
// positions come from our layout engine and can differ from mermaid's.
//
// Everything is drawn with presentation attributes rather than CSS classes, so
// this can appear on the same page as a styled diagram without the two sets of
// rules colliding.
const THEME = {
  nodeFill: '#ECECFF',
  nodeStroke: '#9370DB',
  clusterFill: '#ffffde',
  clusterStroke: '#aaaa33',
  line: '#333333',
  text: '#333333',
  labelBg: '#e8e8e8',
  font: '"trebuchet ms", verdana, arial, sans-serif',
};

function shape(n) {
  const { x, y, w, h } = n;
  const a = `fill="${THEME.nodeFill}" stroke="${THEME.nodeStroke}" stroke-width="1"`;
  switch (n.shape) {
    case 'rhombus':
      return `<polygon ${a} points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}"/>`;
    case 'hexagon': {
      const i = w * 0.18;
      return `<polygon ${a} points="${x + i},${y} ${x + w - i},${y} ${x + w},${y + h / 2} ${x + w - i},${y + h} ${x + i},${y + h} ${x},${y + h / 2}"/>`;
    }
    case 'parallelogram': {
      const i = w * 0.15;
      return `<polygon ${a} points="${x + i},${y} ${x + w},${y} ${x + w - i},${y + h} ${x},${y + h}"/>`;
    }
    case 'trapezoid': {
      const i = w * 0.14;
      return `<polygon ${a} points="${x + i},${y} ${x + w - i},${y} ${x + w},${y + h} ${x},${y + h}"/>`;
    }
    case 'circle':
    case 'doublecircle':
      return `<ellipse ${a} cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
    case 'stadium':
      return `<rect ${a} x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`;
    case 'cylinder': {
      const e = h * 0.16;
      return `<path ${a} d="M ${x} ${y + e} a ${w / 2} ${e} 0 0 1 ${w} 0 v ${h - e * 2} a ${w / 2} ${e} 0 0 1 ${-w} 0 Z"/>`;
    }
    default:
      return `<rect ${a} x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>`;
  }
}

function wrap(label, n, spec) {
  const maxChars = Math.max(6, Math.floor((n.w - spec.padX * 2) / (spec.fontSize * 0.58)));
  const words = String(label).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export function renderMermaidPreview(model) {
  if (!model?.nodes?.length) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"></svg>';
  }
  const spec = DENSITY[model.density] ?? DENSITY.standard;
  const fs = Math.max(12, spec.fontSize * 0.85);

  const defs = '<defs>'
    + `<marker id="fmp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">`
    + `<path d="M 0 0 L 10 5 L 0 10 z" fill="${THEME.line}"/></marker></defs>`;

  const clusters = (model.subgraphs ?? []).filter((s) => s.w > 0).map((s) =>
    `<g><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="4"`
    + ` fill="${THEME.clusterFill}" stroke="${THEME.clusterStroke}" stroke-width="1"/>`
    + `<text x="${s.x + s.w / 2}" y="${s.y + 16}" text-anchor="middle"`
    + ` font-family=${JSON.stringify(THEME.font)} font-size="${fs}" fill="${THEME.text}">${esc(s.label)}</text></g>`).join('');

  const edges = model.edges.map((e) => {
    const dash = e.kind === 'dotted' ? ' stroke-dasharray="3 3"' : '';
    const width = e.kind === 'thick' ? 3.5 : 2;
    const marker = e.arrow === 'none' ? '' : ' marker-end="url(#fmp-arrow)"';
    const path = `<path d="${e.path}" fill="none" stroke="${THEME.line}" stroke-width="${width}"${dash}${marker}/>`;
    if (!e.label) return path;
    const halfW = e.label.length * fs * 0.3 + 6;
    return path
      + `<rect x="${e.labelPos.x - halfW}" y="${e.labelPos.y - fs * 0.75}" width="${halfW * 2}"`
      + ` height="${fs * 1.5}" fill="${THEME.labelBg}" rx="2"/>`
      + `<text x="${e.labelPos.x}" y="${e.labelPos.y}" text-anchor="middle" dominant-baseline="central"`
      + ` font-family=${JSON.stringify(THEME.font)} font-size="${fs * 0.9}" fill="${THEME.text}">${esc(e.label)}</text>`;
  }).join('');

  const nodes = model.nodes.map((n) => {
    const lines = wrap(n.label, n, spec);
    const lineH = fs * 1.25;
    const startY = n.y + n.h / 2 - ((lines.length - 1) * lineH) / 2;
    const tspans = lines.map((line, i) =>
      `<tspan x="${n.x + n.w / 2}" y="${(startY + i * lineH).toFixed(2)}">${esc(line)}</tspan>`).join('');
    return `<g>${shape(n)}<text text-anchor="middle" dominant-baseline="middle"`
      + ` font-family=${JSON.stringify(THEME.font)} font-size="${fs}" fill="${THEME.text}">${tspans}</text></g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${model.bounds.w} ${model.bounds.h}"`
    + ` width="${model.bounds.w}" height="${model.bounds.h}" role="img"`
    + ` aria-label="Plain mermaid rendering">${defs}${clusters}${edges}${nodes}</svg>`;
}
