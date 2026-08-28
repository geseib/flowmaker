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
.fm-node-shape { fill: var(--tone); stroke: var(--ink); stroke-width: var(--stroke); rx: 0; transition: transform .12s ease; }
.fm-node-rule { stroke: var(--tone-ink); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--tone-ink); font-size: ${spec.fontSize}px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.fm-node-icon { display: none; }
.fm-node-badge { display: none; }
.fm-node-rail { display: none; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { filter: drop-shadow(${Math.round(spec.stroke * 2)}px ${Math.round(spec.stroke * 2)}px 0 var(--ink)); }
.fm-node:focus { outline: none; }
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
.fm-edge-carry-tie { stroke: var(--border); stroke-width: var(--stroke); stroke-dasharray: 3 4; }
.fm-edge-carry-icon { color: var(--c3); overflow: visible; }
.fm-edge-carry-text { fill: var(--ink); font-size: ${spec.labelFontSize}px; font-weight: 700; letter-spacing: .01em; paint-order: stroke; stroke: var(--ground); stroke-width: 4px; stroke-linejoin: round; }
.fm-wrap-tag circle { fill: var(--ground); stroke: var(--c4); stroke-width: var(--stroke); }
.fm-wrap-tag-text { fill: var(--c4); font-size: ${spec.labelFontSize + 2}px; font-weight: 800; letter-spacing: .04em; }
`.trim(),
};
