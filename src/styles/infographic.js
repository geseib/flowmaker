export default {
  key: 'infographic',
  name: 'Infographic',
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
.fm-subgraph rect { fill: var(--surface-2); stroke: none; rx: calc(var(--corner) + 8px); }
.fm-subgraph text { fill: var(--ink-dim); font-size: ${spec.labelFontSize + 3}px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.fm-node-shape { fill: var(--c1); stroke: none; transition: filter .16s ease; }
.fm-node[data-kind="decision"] .fm-node-shape { fill: var(--c2); }
.fm-node[data-kind="terminal"] .fm-node-shape { fill: var(--c3); }
.fm-node-rule { stroke: var(--c1-ink); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--c1-ink); font-size: ${spec.fontSize}px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.fm-node[data-kind="decision"] .fm-node-label { fill: var(--c2-ink); }
.fm-node[data-kind="terminal"] .fm-node-label { fill: var(--c3-ink); }
.fm-node-icon { display: block; color: var(--c1-ink); }
.fm-node[data-kind="decision"] .fm-node-icon { color: var(--c2-ink); }
.fm-node[data-kind="terminal"] .fm-node-icon { color: var(--c3-ink); }
.fm-node-icon [stroke] { stroke-width: ${Math.max(1.6, spec.stroke * 0.8)}; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { filter: drop-shadow(${Math.round(spec.stroke * 1.6)}px ${Math.round(spec.stroke * 1.6)}px 0 var(--border)); }
.fm-node:focus-visible { outline: none; }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { fill: var(--c3); filter: drop-shadow(0 0 0 transparent) drop-shadow(${Math.round(spec.stroke * 2.4)}px ${Math.round(spec.stroke * 2.4)}px 0 var(--ink-dim)); }
.fm-node[data-active="true"] .fm-node-label, .fm-node[data-active="true"] .fm-node-icon { color: var(--c3-ink); fill: var(--c3-ink); }
.fm-edge { fill: none; stroke: var(--c1); stroke-width: calc(var(--stroke) * 1.2); stroke-linecap: round; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 2 10; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 2); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-width: var(--stroke); }
.fm-edge-label { fill: var(--ink); font-size: ${spec.labelFontSize}px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.fm-edge-label-bg { fill: var(--surface); rx: 999px; }
.fm-arrow { fill: var(--c1); }
.fm-arrow-alert { fill: var(--c4); }
`.trim(),
};
