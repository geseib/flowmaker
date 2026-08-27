export default {
  key: 'infographic',
  name: 'Infographic',
  dark: false,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --stroke: ${spec.stroke}px;
  --corner: ${Math.round(spec.corner * 1.7)}px;
  background: var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: none; stroke: var(--border); stroke-width: var(--stroke); stroke-dasharray: 3 7; rx: calc(var(--corner) + 10px); }
.fm-subgraph text { fill: var(--ink-dim); font-size: ${spec.labelFontSize + 3}px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }

/* Outlined cards, not filled blocks: the colour lives in the border, the icon
   ring, and the connectors, while the label stays high-contrast ink. */
.fm-node-shape {
  fill: var(--surface);
  stroke: var(--c1);
  stroke-width: calc(var(--stroke) * 1.5);
  transition: stroke-width .18s ease, filter .18s ease;
}
.fm-node[data-kind="decision"] .fm-node-shape { stroke: var(--c2); }
.fm-node[data-kind="terminal"] .fm-node-shape { stroke: var(--c3); }
.fm-node-rule { stroke: var(--c1); stroke-width: var(--stroke); }
.fm-node-rail { display: none; }
.fm-node-label { fill: var(--ink); font-size: ${spec.fontSize}px; font-weight: 650; letter-spacing: .04em; }

/* The icon sits inside its own ring, the motif the reference infographics use. */
.fm-node-icon { display: block; color: var(--c1); }
.fm-node[data-kind="decision"] .fm-node-icon { color: var(--c2); }
.fm-node[data-kind="terminal"] .fm-node-icon { color: var(--c3); }
.fm-node-icon [stroke] { stroke-width: ${Math.max(1.5, spec.stroke * 0.72)}; }
.fm-node-badge {
  display: block;
  fill: var(--surface);
  stroke: var(--c1);
  stroke-width: calc(var(--stroke) * 1.15);
}
.fm-node[data-kind="decision"] .fm-node-badge { stroke: var(--c2); }
.fm-node[data-kind="terminal"] .fm-node-badge { stroke: var(--c3); }

.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { stroke-width: calc(var(--stroke) * 2.4); }
.fm-node:focus { outline: none; }
.fm-node:focus-visible { outline: none; }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { stroke: var(--c3); stroke-width: calc(var(--stroke) * 2.6); filter: drop-shadow(0 6px 20px color-mix(in oklab, var(--c3) 40%, transparent)); }
.fm-node[data-active="true"] .fm-node-badge { stroke: var(--c3); }
.fm-node[data-active="true"] .fm-node-icon { color: var(--c3); }

.fm-edge { fill: none; stroke: var(--ink-dim); stroke-width: var(--stroke); stroke-linecap: round; opacity: .8; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 2 8; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 1.8); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 9 7; opacity: 1; }
.fm-edge-label { fill: var(--ink-dim); font-size: ${spec.labelFontSize}px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.fm-edge-label-bg { fill: var(--ground); rx: 999px; }
.fm-arrow { fill: var(--ink-dim); }
.fm-arrow-alert { fill: var(--c4); }
.fm-wrap-tag circle { fill: var(--ground); stroke: var(--c4); stroke-width: var(--stroke); }
.fm-wrap-tag-text { fill: var(--c4); font-size: ${spec.labelFontSize + 2}px; font-weight: 800; letter-spacing: .04em; }
`.trim(),
};
