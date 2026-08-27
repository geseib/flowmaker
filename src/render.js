import { DENSITY } from './constants.js';
import { getStyle } from './styles/index.js';
import { deriveTokens } from './palettes.js';
import { ICONS, iconFor, showIconsFor } from './icons.js';
import { esc } from './escape.js';

// Decision-ish and terminal-ish shapes get semantic colouring from the palette.
const KIND = {
  rhombus: 'decision',
  hexagon: 'decision',
  circle: 'terminal',
  doublecircle: 'terminal',
  stadium: 'terminal',
};
const kindOf = (shape) => KIND[shape] ?? 'process';

function shapeMarkup(n, spec) {
  const { x, y, w, h } = n;
  const r = spec.corner;
  switch (n.shape) {
    case 'rhombus':
      return `<polygon class="fm-node-shape" points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}"/>`;
    case 'hexagon': {
      const i = w * 0.18;
      return `<polygon class="fm-node-shape" points="${x + i},${y} ${x + w - i},${y} ${x + w},${y + h / 2} ${x + w - i},${y + h} ${x + i},${y + h} ${x},${y + h / 2}"/>`;
    }
    case 'parallelogram': {
      const i = w * 0.15;
      return `<polygon class="fm-node-shape" points="${x + i},${y} ${x + w},${y} ${x + w - i},${y + h} ${x},${y + h}"/>`;
    }
    case 'trapezoid': {
      const i = w * 0.14;
      return `<polygon class="fm-node-shape" points="${x + i},${y} ${x + w - i},${y} ${x + w},${y + h} ${x},${y + h}"/>`;
    }
    case 'circle':
      return `<ellipse class="fm-node-shape" cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
    case 'doublecircle':
      return `<ellipse class="fm-node-shape" cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`
        + `<ellipse class="fm-node-shape fm-node-inner" cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2 - 7}" ry="${h / 2 - 7}" fill="none"/>`;
    case 'stadium':
      return `<rect class="fm-node-shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`;
    case 'round':
      return `<rect class="fm-node-shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r * 1.8}"/>`;
    case 'subroutine':
      return `<rect class="fm-node-shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r * 0.4}"/>`
        + `<line class="fm-node-rule" x1="${x + 10}" y1="${y}" x2="${x + 10}" y2="${y + h}"/>`
        + `<line class="fm-node-rule" x1="${x + w - 10}" y1="${y}" x2="${x + w - 10}" y2="${y + h}"/>`;
    case 'cylinder': {
      const e = h * 0.16;
      return `<path class="fm-node-shape" d="M ${x} ${y + e} a ${w / 2} ${e} 0 0 1 ${w} 0 v ${h - e * 2} a ${w / 2} ${e} 0 0 1 ${-w} 0 Z"/>`;
    }
    default:
      return `<rect class="fm-node-shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
  }
}

// Greedy wrap on the pre-computed node width, mirroring measure.js.
function wrapLabel(label, n, spec) {
  const maxChars = Math.max(6, Math.floor((n.w - spec.padX * 2) / (spec.fontSize * 0.58)));
  const lines = [];
  // A <br> in the label is a deliberate break, which is how a box carries a
  // name on one line and a role on the next.
  for (const segment of String(label).split(/<br\s*\/?>/i)) {
    const words = segment.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
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
  }
  return lines.length ? lines : [''];
}

// Shapes that can carry an accent rail down their leading edge. A straight bar
// against a diamond or a circle reads as a rendering fault, so they are excluded.
// Icon ring radius as a fraction of the icon box.
const RING_RATIO = 0.72;

const RAIL_SHAPES = new Set(['rect', 'round', 'subroutine', 'parallelogram', 'trapezoid']);

// Emitted for every style; only the styles that want it un-hide it in CSS.
function railMarkup(n, spec) {
  if (!RAIL_SHAPES.has(n.shape)) return '';
  const w = Math.max(5, spec.stroke * 3.2);
  const r = Math.min(spec.corner, w);
  const { x, y, h } = n;
  const d = `M ${x + r} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x + r} ${y + h}`
    + ` Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  return `<path class="fm-node-rail" d="${d}"/>`;
}

// The icon anchors to the top of the node and reports where it ends, so the
// label can be centred in the space beneath it rather than fighting it for the
// middle. Layout has already reserved the height (see layout.js iconSpace).
function iconMarkup(n, spec, iconName) {
  if (!iconName) return { markup: '', bottom: null };
  const size = spec.fontSize * 1.5;
  const scale = size / 24;
  const top = n.y + spec.padY * 0.6;
  const x = n.x + n.w / 2 - size / 2;
  // A ring behind the icon, for styles that want the badge treatment. Hidden
  // by default like the rail.
  // The ring is wider than the glyph, so it — not the glyph — defines where the
  // label may begin. RING_RATIO is kept in step with the space layout reserves.
  const badge = `<circle class="fm-node-badge" cx="${(n.x + n.w / 2).toFixed(2)}" cy="${(top + size / 2).toFixed(2)}" r="${(size * RING_RATIO).toFixed(2)}"/>`;
  return {
    markup: badge
      + `<g class="fm-node-icon" aria-hidden="true" transform="translate(${x.toFixed(2)} ${top.toFixed(2)}) scale(${scale.toFixed(4)})">${ICONS[iconName]}</g>`,
    bottom: top + size / 2 + size * RING_RATIO,
  };
}

function nodeMarkup(n, spec, details, showIcons, nativeTitles) {
  const detail = details?.[n.id];
  const iconName = showIcons ? iconFor(n) : null;
  const icon = iconMarkup(n, spec, iconName);
  const lines = wrapLabel(n.label, n, spec);
  const lineH = spec.fontSize * 1.28;

  // With an icon, the label occupies the band between the icon and the bottom
  // padding. Without one, it simply centres on the node.
  const bandTop = icon.bottom === null ? n.y : icon.bottom + spec.padY * 0.35;
  const bandBottom = n.y + n.h - (icon.bottom === null ? 0 : spec.padY * 0.5);
  const centre = (bandTop + bandBottom) / 2;
  const startY = centre - ((lines.length - 1) * lineH) / 2;

  const tspans = lines
    .map((line, i) => `<tspan x="${n.x + n.w / 2}" y="${(startY + i * lineH).toFixed(2)}">${esc(line)}</tspan>`)
    .join('');
  // A forced break is a layout instruction, not something to read out.
  const spoken = String(n.label).replace(/<br\s*\/?>/gi, ', ');
  const name = detail?.tooltip ? `${spoken}. ${detail.tooltip}` : spoken;
  return [
    `<g class="fm-node" data-node-id="${esc(n.id)}" data-kind="${kindOf(n.shape)}"`,
    iconName ? ` data-icon="${esc(iconName)}"` : '',
    detail ? ' data-has-detail="true"' : '',
    ` tabindex="0" role="button" aria-label="${esc(name)}">`,
    nativeTitles && detail?.tooltip ? `<title>${esc(detail.tooltip)}</title>` : '',
    shapeMarkup(n, spec),
    railMarkup(n, spec),
    icon.markup,
    `<text class="fm-node-label" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`,
    '</g>',
  ].join('');
}

function edgeMarkup(e, spec) {
  const marker = e.isBackEdge ? 'fm-arrow-alert' : 'fm-arrow-head';
  const attrs = [
    `data-edge="${esc(e.from)}__${esc(e.to)}"`,
    `data-kind="${e.kind}"`,
    e.isBackEdge ? 'data-back="true"' : '',
    e.isWrap ? 'data-wrap="true"' : '',
    e.arrow === 'none' ? '' : `marker-end="url(#${marker})"`,
    e.arrow === 'bidirectional' ? `marker-start="url(#${marker}-start)"` : '',
  ].filter(Boolean).join(' ');
  const path = `<path class="fm-edge" d="${e.path}" ${attrs}/>`;

  // A long loop is drawn as a matching pair of tagged connectors instead of one
  // line dragged across the diagram. The shared letter is what links them.
  const tags = (e.wrapTags ?? []).map((t) => {
    const r = e.tagRadius ?? spec.fontSize * 0.78;
    return `<g class="fm-wrap-tag" data-role="${t.role}" data-tag="${esc(t.tag)}">`
      + `<circle cx="${t.x}" cy="${t.y}" r="${r}"/>`
      + `<text class="fm-wrap-tag-text" x="${t.x}" y="${t.y}" text-anchor="middle" dominant-baseline="central">${esc(t.tag)}</text>`
      + '</g>';
  }).join('');

  if (!e.label) return path + tags;
  const halfW = e.label.length * spec.labelFontSize * 0.32 + 8;
  const halfH = spec.labelFontSize * 0.85;
  return path
    + `<rect class="fm-edge-label-bg" x="${e.labelPos.x - halfW}" y="${e.labelPos.y - halfH}" width="${halfW * 2}" height="${halfH * 2}" rx="4"/>`
    + `<text class="fm-edge-label" x="${e.labelPos.x}" y="${e.labelPos.y}" text-anchor="middle" dominant-baseline="middle">${esc(e.label)}</text>`
    + tags;
}

export function styleCss(styleKey, tokens, densityKey) {
  const style = getStyle(styleKey);
  const spec = DENSITY[densityKey] ?? DENSITY.standard;
  return style.css(tokens, spec);
}

export function renderSvg(model, opts = {}) {
  const spec = DENSITY[model.density] ?? DENSITY.standard;
  const details = opts.details ?? {};
  // markerUnits defaults to strokeWidth, which multiplies the marker box by the
  // edge's stroke width. At marquee density with a thick style that produced
  // arrowheads dozens of pixels across, swallowing the wrap connectors and
  // dwarfing the nodes. Size them in absolute units instead.
  const arrowSize = Math.max(11, spec.stroke * 3.6);

  const defs = `<defs>`
    + `<marker id="fm-arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="${arrowSize}" markerHeight="${arrowSize}" orient="auto-start-reverse"><path class="fm-arrow" d="M 0 0 L 10 5 L 0 10 z"/></marker>`
    + `<marker id="fm-arrow-alert" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="${arrowSize}" markerHeight="${arrowSize}" orient="auto-start-reverse"><path class="fm-arrow-alert" d="M 0 0 L 10 5 L 0 10 z"/></marker>`
    + `<marker id="fm-arrow-head-start" viewBox="0 0 10 10" refX="1" refY="5" markerUnits="userSpaceOnUse" markerWidth="${arrowSize}" markerHeight="${arrowSize}" orient="auto"><path class="fm-arrow" d="M 10 0 L 0 5 L 10 10 z"/></marker>`
    + `<marker id="fm-arrow-alert-start" viewBox="0 0 10 10" refX="1" refY="5" markerUnits="userSpaceOnUse" markerWidth="${arrowSize}" markerHeight="${arrowSize}" orient="auto"><path class="fm-arrow-alert" d="M 10 0 L 0 5 L 10 10 z"/></marker>`
    + `</defs>`;

  const subgraphs = (model.subgraphs ?? [])
    .filter((s) => s.w > 0)
    .map((s) => `<g class="fm-subgraph" data-subgraph="${esc(s.id)}">`
      + `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/>`
      + `<text x="${s.x + 18}" y="${s.y + 22}">${esc(s.label)}</text></g>`)
    .join('');

  const edges = model.edges.map((e) => edgeMarkup(e, spec)).join('');
  const showIcons = opts.showIcons ?? showIconsFor(opts.styleKey);
  const nodes = model.nodes.map((n) => nodeMarkup(n, spec, details, showIcons, opts.nativeTitles)).join('');
  const title = opts.meta?.title ? `<title>${esc(opts.meta.title)}</title>` : '';

  // The studio's runtime builds the travelling dots in script. A snippet has no
  // script, so draw them here and let CSS motion paths carry them.
  const pulseDuration = { marquee: 2600, standard: 2000, compact: 1700 }[model.density] ?? 2000;
  const pulseR = { marquee: 7, standard: 4.5, compact: 3 }[model.density] ?? 4.5;
  const pulses = opts.pulses
    ? `<g class="fm-layer-pulses" aria-hidden="true">${model.edges.map((e, i) => (e.path
      ? `<circle class="fm-pulse" cx="0" cy="0" r="${pulseR}"${e.isBackEdge ? ' data-back="true"' : ''}`
        + ` style="offset-path:path(&quot;${e.path}&quot;);offset-rotate:0deg;`
        + `animation:fm-travel ${pulseDuration}ms linear infinite;`
        + `animation-delay:${(i % 5) * (pulseDuration / 5)}ms"/>`
      : '')).join('')}</g>`
    : '';

  return `<svg class="fm-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${model.bounds.w} ${model.bounds.h}" `
    + `width="${model.bounds.w}" height="${model.bounds.h}" role="img" `
    + `aria-label="${esc(opts.meta?.title ?? 'Flow diagram')}">`
    + `${title}${defs}<g class="fm-layer-subgraphs">${subgraphs}</g>`
    + `<g class="fm-layer-edges">${edges}</g>${pulses}<g class="fm-layer-nodes">${nodes}</g></svg>`;
}

export { deriveTokens };
