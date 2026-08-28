export default {
  key: 'executive-clean',
  name: 'Executive Clean',
  dark: false,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --stroke: ${spec.stroke}px;
  --corner: ${spec.corner}px;
  background: var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: var(--surface-2); stroke: var(--border); stroke-width: var(--stroke); rx: calc(var(--corner) + 6px); }
.fm-subgraph text { fill: var(--ink-dim); font-size: ${spec.labelFontSize + 3}px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.fm-node-shape { fill: var(--surface); stroke: var(--tone); stroke-width: var(--stroke); transition: filter .18s ease, stroke-width .18s ease; }
/* A plain step keeps a white card; anything singled out gets a tinted one. */
.fm-node[data-kind="decision"] .fm-node-shape,
.fm-node[data-kind="terminal"] .fm-node-shape { fill: var(--tone-soft); }
.fm-node-rule { stroke: var(--tone); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--ink); font-size: ${spec.fontSize}px; font-weight: 650; }
.fm-node-icon { display: none; }
.fm-node-badge { display: none; }
.fm-node-rail { display: none; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { filter: drop-shadow(0 4px 14px rgb(0 0 0 / .18)); stroke-width: calc(var(--stroke) * 1.6); }
.fm-node:focus { outline: none; }
.fm-node:focus-visible { outline: none; }
.fm-node:focus-visible .fm-node-shape { stroke: var(--c2); }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { stroke: var(--c3); stroke-width: calc(var(--stroke) * 2); filter: drop-shadow(0 0 18px var(--c3)); }
.fm-edge { fill: none; stroke: var(--c1); stroke-width: var(--stroke); stroke-linecap: round; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 2 10; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 1.9); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 12 9; }
.fm-edge-label { fill: var(--ink-dim); font-size: ${spec.labelFontSize}px; font-weight: 700; }
.fm-edge-label-bg { fill: var(--ground); }
.fm-arrow { fill: var(--c1); }
.fm-arrow-alert { fill: var(--c4); }
.fm-wrap-tag circle { fill: var(--ground); stroke: var(--c4); stroke-width: var(--stroke); }
.fm-wrap-tag-text { fill: var(--c4); font-size: ${spec.labelFontSize + 2}px; font-weight: 800; letter-spacing: .04em; }
`.trim(),
};
