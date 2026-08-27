export default {
  key: 'accent-rail',
  name: 'Accent Rail',
  dark: false,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --stroke: ${spec.stroke}px;
  --corner: ${Math.round(spec.corner * 1.25)}px;
  background: var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: var(--surface-2); stroke: none; rx: calc(var(--corner) + 8px); }
.fm-subgraph text { fill: var(--ink-dim); font-size: ${spec.labelFontSize + 2}px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }

/* Quiet cards carrying a single coloured bar on the leading edge. The colour
   codes the step; the card itself stays out of the way. */
.fm-node-shape {
  fill: var(--surface);
  stroke: var(--border);
  stroke-width: 1;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / .06)) drop-shadow(0 6px 16px rgb(0 0 0 / .07));
  transition: filter .18s ease;
}
.fm-node-rail { display: block; fill: var(--c1); stroke: none; }
.fm-node[data-kind="decision"] .fm-node-rail { fill: var(--c2); }
.fm-node[data-kind="terminal"] .fm-node-rail { fill: var(--c3); }
/* Shapes with no rail (diamonds, circles) carry the colour on their outline. */
.fm-node[data-kind="decision"] .fm-node-shape { stroke: var(--c2); stroke-width: calc(var(--stroke) * 1.2); }
.fm-node[data-kind="terminal"] .fm-node-shape { stroke: var(--c3); stroke-width: calc(var(--stroke) * 1.2); }
.fm-node-rule { stroke: var(--border); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--ink); font-size: ${spec.fontSize}px; font-weight: 600; letter-spacing: -.005em; }
.fm-node-icon { display: none; }
.fm-node-badge { display: none; }

.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { filter: drop-shadow(0 2px 4px rgb(0 0 0 / .08)) drop-shadow(0 14px 32px rgb(0 0 0 / .14)); }
.fm-node:focus { outline: none; }
.fm-node:focus-visible { outline: none; }
.fm-node:focus-visible .fm-node-shape { stroke: var(--c2); stroke-width: calc(var(--stroke) * 1.2); }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-rail { fill: var(--c3); }
.fm-node[data-active="true"] .fm-node-shape { stroke: var(--c3); stroke-width: calc(var(--stroke) * 1.4); filter: drop-shadow(0 8px 26px color-mix(in oklab, var(--c3) 32%, transparent)); }

.fm-edge { fill: none; stroke: var(--ink-dim); stroke-width: var(--stroke); stroke-linecap: round; opacity: .55; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 2 8; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 1.7); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 8 7; opacity: .95; }
.fm-edge-label { fill: var(--ink-dim); font-size: ${spec.labelFontSize}px; font-weight: 650; }
.fm-edge-label-bg { fill: var(--ground); rx: 6px; }
.fm-arrow { fill: var(--ink-dim); }
.fm-arrow-alert { fill: var(--c4); }
.fm-wrap-tag circle { fill: var(--ground); stroke: var(--c4); stroke-width: var(--stroke); }
.fm-wrap-tag-text { fill: var(--c4); font-size: ${spec.labelFontSize + 2}px; font-weight: 800; letter-spacing: .04em; }
`.trim(),
};
