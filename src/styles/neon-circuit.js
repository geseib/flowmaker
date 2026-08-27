export default {
  key: 'neon-circuit',
  name: 'Neon Circuit',
  dark: true,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: "SF Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --stroke: ${spec.stroke}px;
  --corner: ${spec.corner}px;
  background:
    radial-gradient(ellipse 80% 60% at 50% 40%, color-mix(in oklab, var(--c1) 14%, transparent), transparent 70%),
    var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: color-mix(in oklab, var(--c1) 6%, transparent); stroke: color-mix(in oklab, var(--c1) 45%, transparent); stroke-width: var(--stroke); rx: calc(var(--corner) + 8px); }
.fm-subgraph text { fill: var(--c1); font-size: ${spec.labelFontSize + 3}px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
.fm-node-shape {
  fill: color-mix(in oklab, var(--c1) 12%, var(--surface));
  stroke: var(--c1); stroke-width: var(--stroke);
  filter: drop-shadow(0 0 calc(var(--stroke) * 2.4) color-mix(in oklab, var(--c1) 70%, transparent));
  transition: filter .2s ease, stroke-width .2s ease;
}
.fm-node[data-kind="decision"] .fm-node-shape { stroke: var(--c2); fill: color-mix(in oklab, var(--c2) 12%, var(--surface)); filter: drop-shadow(0 0 calc(var(--stroke) * 2.4) color-mix(in oklab, var(--c2) 70%, transparent)); }
.fm-node[data-kind="terminal"] .fm-node-shape { stroke: var(--c3); fill: color-mix(in oklab, var(--c3) 14%, var(--surface)); filter: drop-shadow(0 0 calc(var(--stroke) * 2.8) color-mix(in oklab, var(--c3) 80%, transparent)); }
.fm-node-rule { stroke: var(--c1); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--ink); font-size: ${spec.fontSize}px; font-weight: 700; letter-spacing: .02em; }
.fm-node-icon { display: none; }
.fm-node-badge { display: none; }
.fm-node-rail { display: none; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { stroke-width: calc(var(--stroke) * 1.7); filter: drop-shadow(0 0 calc(var(--stroke) * 5) var(--c1)); }
.fm-node:focus-visible { outline: none; }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { stroke: var(--c3); stroke-width: calc(var(--stroke) * 2); filter: drop-shadow(0 0 calc(var(--stroke) * 7) var(--c3)); }
.fm-edge { fill: none; stroke: var(--c1); stroke-width: var(--stroke); stroke-linecap: round; filter: drop-shadow(0 0 calc(var(--stroke) * 1.4) currentColor); }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 1 12; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 2); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 14 10; }
.fm-edge-label { fill: var(--ink); font-size: ${spec.labelFontSize}px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.fm-edge-label-bg { fill: var(--ground); }
.fm-arrow { fill: var(--c1); }
.fm-arrow-alert { fill: var(--c4); }
.fm-wrap-tag circle { fill: var(--ground); stroke: var(--c4); stroke-width: var(--stroke); }
.fm-wrap-tag-text { fill: var(--c4); font-size: ${spec.labelFontSize + 2}px; font-weight: 800; letter-spacing: .04em; }
`.trim(),
};
