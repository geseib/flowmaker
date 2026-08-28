export default {
  key: 'blueprint',
  name: 'Blueprint',
  dark: true,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --stroke: ${Math.max(1, spec.stroke * 0.7)}px;
  --corner: 2px;
  background:
    repeating-linear-gradient(0deg, color-mix(in oklab, var(--c1) 16%, transparent) 0 1px, transparent 1px ${Math.round(spec.laneGap / 2)}px),
    repeating-linear-gradient(90deg, color-mix(in oklab, var(--c1) 16%, transparent) 0 1px, transparent 1px ${Math.round(spec.laneGap / 2)}px),
    var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: none; stroke: color-mix(in oklab, var(--c1) 55%, transparent); stroke-width: var(--stroke); stroke-dasharray: 6 5; rx: 2px; }
.fm-subgraph text { fill: var(--c1); font-size: ${spec.labelFontSize + 2}px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
.fm-node-shape { fill: color-mix(in oklab, var(--ground) 82%, transparent); stroke: var(--tone); stroke-width: var(--stroke); transition: stroke-width .16s ease; }
.fm-node-rule { stroke: var(--tone); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--ink); font-size: ${Math.round(spec.fontSize * 0.92)}px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; }
.fm-node-icon { display: none; }
.fm-node-badge { display: none; }
.fm-node-rail { display: none; }
.fm-node[data-has-detail="true"] { cursor: crosshair; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { stroke-width: calc(var(--stroke) * 2.4); }
.fm-node:focus { outline: none; }
.fm-node:focus-visible { outline: none; }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { stroke: var(--c3); stroke-width: calc(var(--stroke) * 3); }
.fm-edge { fill: none; stroke: var(--c1); stroke-width: var(--stroke); stroke-linecap: square; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 3 4; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 2.4); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 10 3 2 3; }
.fm-edge-label { fill: var(--c1); font-size: ${spec.labelFontSize}px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; }
.fm-edge-label-bg { fill: var(--ground); }
.fm-arrow { fill: var(--c1); }
.fm-arrow-alert { fill: var(--c4); }
.fm-edge-carry-tie { stroke: var(--border); stroke-width: var(--stroke); stroke-dasharray: 3 4; }
.fm-edge-carry-icon { color: var(--c3); overflow: visible; }
.fm-edge-carry-text { fill: var(--ink); font-size: ${spec.labelFontSize}px; font-weight: 700; letter-spacing: .01em; paint-order: stroke; stroke: var(--ground); stroke-width: 4px; stroke-linejoin: round; }
.fm-wrap-tag circle { fill: var(--ground); stroke: var(--c4); stroke-width: var(--stroke); }
.fm-wrap-tag-text { fill: var(--c4); font-size: ${spec.labelFontSize + 2}px; font-weight: 800; letter-spacing: .04em; }
`.trim(),
};
