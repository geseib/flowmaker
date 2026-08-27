export default {
  key: 'soft-depth',
  name: 'Soft Depth',
  dark: false,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --stroke: ${spec.stroke}px;
  --corner: ${Math.round(spec.corner * 1.9)}px;
  background: linear-gradient(165deg, var(--surface-2), var(--ground));
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: var(--surface-2); stroke: none; rx: calc(var(--corner) + 10px); filter: drop-shadow(0 10px 26px rgb(0 0 0 / .07)); }
.fm-subgraph text { fill: var(--ink-dim); font-size: ${spec.labelFontSize + 3}px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.fm-node-shape {
  fill: var(--surface); stroke: none;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / .12)) drop-shadow(0 12px 28px rgb(0 0 0 / .12));
  transition: filter .22s ease;
}
.fm-node[data-kind="decision"] .fm-node-shape { fill: var(--c2-soft); }
.fm-node[data-kind="terminal"] .fm-node-shape { fill: var(--c3-soft); }
.fm-node-rule { stroke: var(--border); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--ink); font-size: ${spec.fontSize}px; font-weight: 600; letter-spacing: -.005em; }
.fm-node-icon { display: none; }
.fm-node-badge { display: none; }
.fm-node-rail { display: none; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { filter: drop-shadow(0 2px 4px rgb(0 0 0 / .14)) drop-shadow(0 20px 44px rgb(0 0 0 / .2)); }
.fm-node:focus-visible { outline: none; }
.fm-node:focus-visible .fm-node-shape { stroke: var(--c2); stroke-width: var(--stroke); }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { fill: var(--c3-soft); filter: drop-shadow(0 2px 6px rgb(0 0 0 / .16)) drop-shadow(0 0 30px color-mix(in oklab, var(--c3) 55%, transparent)); }
.fm-edge { fill: none; stroke: var(--c1); stroke-width: var(--stroke); stroke-linecap: round; opacity: .72; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 2 9; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 1.8); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 10 8; opacity: .85; }
.fm-edge-label { fill: var(--ink-dim); font-size: ${spec.labelFontSize}px; font-weight: 650; }
.fm-edge-label-bg { fill: var(--surface); }
.fm-arrow { fill: var(--c1); }
.fm-arrow-alert { fill: var(--c4); }
.fm-wrap-tag circle { fill: var(--ground); stroke: var(--c4); stroke-width: var(--stroke); }
.fm-wrap-tag-text { fill: var(--c4); font-size: ${spec.labelFontSize + 2}px; font-weight: 800; letter-spacing: .04em; }
`.trim(),
};
