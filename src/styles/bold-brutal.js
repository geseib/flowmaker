export default {
  key: 'bold-brutal',
  name: 'Bold Brutal',
  dark: false,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: "Helvetica Neue", Helvetica, Arial, -apple-system, BlinkMacSystemFont, sans-serif;
  --stroke: ${spec.stroke * 1.4}px;
  --corner: 0px;
  background: var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: none; stroke: var(--ink); stroke-width: var(--stroke); rx: 0; }
.fm-subgraph text { fill: var(--ink); font-size: ${spec.labelFontSize + 4}px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
.fm-node-shape { fill: var(--c1); stroke: var(--ink); stroke-width: var(--stroke); rx: 0; transition: transform .12s ease; }
.fm-node[data-kind="decision"] .fm-node-shape { fill: var(--c2); }
.fm-node[data-kind="terminal"] .fm-node-shape { fill: var(--c3); }
.fm-node-rule { stroke: var(--c1-ink); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--c1-ink); font-size: ${spec.fontSize}px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.fm-node[data-kind="decision"] .fm-node-label { fill: var(--c2-ink); }
.fm-node[data-kind="terminal"] .fm-node-label { fill: var(--c3-ink); }
.fm-node-icon { display: none; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { filter: drop-shadow(${Math.round(spec.stroke * 2)}px ${Math.round(spec.stroke * 2)}px 0 var(--ink)); }
.fm-node:focus-visible { outline: none; }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { fill: var(--c3); filter: drop-shadow(${Math.round(spec.stroke * 3)}px ${Math.round(spec.stroke * 3)}px 0 var(--ink)); }
.fm-node[data-active="true"] .fm-node-label { fill: var(--c3-ink); }
.fm-edge { fill: none; stroke: var(--ink); stroke-width: calc(var(--stroke) * 1.2); stroke-linecap: butt; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 4 8; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 2.2); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 16 8; }
.fm-edge-label { fill: var(--ink); font-size: ${spec.labelFontSize + 2}px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.fm-edge-label-bg { fill: var(--ground); }
.fm-arrow { fill: var(--ink); }
.fm-arrow-alert { fill: var(--c4); }
`.trim(),
};
