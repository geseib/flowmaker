import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSvg, styleCss } from '../src/render.js';
import { layout } from '../src/layout.js';
import { parseMermaid } from '../src/mermaid.js';
import { getPalette, deriveTokens } from '../src/palettes.js';
import { DENSITY, STYLE_KEYS } from '../src/constants.js';

const model = layout(parseMermaid('flowchart LR\nA[Start] -->|Yes| B{Choose}\nB --> C[Done]\nC --> A'));
const opts = {
  styleKey: 'executive-clean',
  palette: getPalette('harbor'),
  meta: { title: 'Demo', subtitle: null },
  details: { A: { id: 'A', title: 'Start', tooltip: 'Begin here.', bodyMd: 'More.' } },
};

test('produces a well-formed svg whose viewBox matches the bounds', () => {
  const svg = renderSvg(model, opts);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.trimEnd().endsWith('</svg>'));
  assert.ok(svg.includes(`viewBox="0 0 ${model.bounds.w} ${model.bounds.h}"`));
});

test('renders one addressable, keyboard-reachable element per node', () => {
  const svg = renderSvg(model, opts);
  for (const n of model.nodes) assert.ok(svg.includes(`data-node-id="${n.id}"`), `missing ${n.id}`);
  const groups = svg.match(/<g class="fm-node"[^>]*>/g) ?? [];
  assert.equal(groups.length, model.nodes.length);
  for (const g of groups) {
    assert.ok(g.includes('tabindex="0"'));
    assert.ok(/aria-label="[^"]+"/.test(g));
  }
});

test('marks only nodes that have detail content as interactive', () => {
  const svg = renderSvg(model, opts);
  assert.ok(/data-node-id="A"[^>]*data-has-detail="true"/.test(svg));
  assert.equal(/data-node-id="C"[^>]*data-has-detail="true"/.test(svg), false);
});

test('renders one path per edge, flags back edges, and draws labels', () => {
  const svg = renderSvg(model, opts);
  for (const e of model.edges) assert.ok(svg.includes(`data-edge="${e.from}__${e.to}"`));
  assert.ok(/data-edge="C__A"[^>]*data-back="true"/.test(svg));
  assert.ok(svg.includes('>Yes<'));
});

// Arrowheads are sized in absolute units. The default markerUnits is
// strokeWidth, which multiplies the marker box by the edge's stroke width and
// produced arrowheads dozens of pixels across at marquee density.
test('arrowheads are sized in absolute units, not multiplied by stroke width', () => {
  const svg = renderSvg(model, opts);
  const markers = svg.match(/<marker [^>]*>/g) ?? [];
  assert.ok(markers.length >= 4, 'expected the four arrow markers');
  for (const m of markers) {
    assert.ok(m.includes('markerUnits="userSpaceOnUse"'), `marker is stroke-scaled: ${m}`);
  }
});

test('arrowheads stay a sane size relative to a node at every density', () => {
  for (const density of Object.keys(DENSITY)) {
    const m = layout(parseMermaid('flowchart LR\nA[Start] --> B[Next]'), { density });
    const svg = renderSvg(m, opts);
    const width = Number(svg.match(/markerWidth="([\d.]+)"/)[1]);
    const nodeH = m.nodes[0].h;
    assert.ok(width < nodeH * 0.6, `@${density} arrowhead ${width} is huge beside a ${nodeH} node`);
    assert.ok(width >= 10, `@${density} arrowhead ${width} is too small to read`);
  }
});

test('escapes markup in labels rather than emitting it', () => {
  const m = layout(parseMermaid('flowchart LR\nA["<script>alert(1)</script> & co"] --> B'));
  const svg = renderSvg(m, opts);
  assert.equal(svg.includes('<script>'), false);
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(svg.includes('&amp; co'));
});

test('renders a subgraph container with its label', () => {
  const m = layout(parseMermaid('flowchart LR\nsubgraph ops [Operations]\nX[Run] --> Y[Watch]\nend'));
  const svg = renderSvg(m, opts);
  assert.ok(svg.includes('data-subgraph="ops"'));
  assert.ok(svg.includes('>Operations<'));
});

test('emits a distinct shape element for each mermaid shape', () => {
  const m = layout(parseMermaid('flowchart LR\na[R] --> b{D} --> c((C)) --> d([S])'));
  const svg = renderSvg(m, opts);
  assert.ok(/data-node-id="b"[\s\S]*?<(polygon|path)/.test(svg), 'a rhombus must not be a plain rect');
  assert.ok(/data-node-id="c"[\s\S]*?<(ellipse|circle)/.test(svg));
});

test('a wrap connector renders a tag at each end with a shared letter', () => {
  const m = layout(parseMermaid('flowchart LR\nA --> B --> C\nC --> A'), { loops: 'wrap' });
  const svg = renderSvg(m, opts);
  const tags = svg.match(/<g class="fm-wrap-tag"[^>]*>/g) ?? [];
  assert.equal(tags.length, 2);
  assert.ok(tags[0].includes('data-role="out"'));
  assert.ok(tags[1].includes('data-role="in"'));
  const letters = tags.map((t) => t.match(/data-tag="([A-Z])"/)[1]);
  assert.equal(letters[0], letters[1]);
  assert.ok(/data-edge="C__A"[^>]*data-wrap="true"/.test(svg));
});

test('only the Infographic style emits the icon slot', () => {
  const m = layout(parseMermaid('flowchart LR\nA[Capture Payment] --> B'), { iconSpace: true });
  for (const styleKey of STYLE_KEYS) {
    const svg = renderSvg(m, { ...opts, styleKey });
    const has = svg.includes('class="fm-node-icon"');
    assert.equal(has, styleKey === 'infographic', `${styleKey} icon slot is wrong`);
  }
});

test('an empty model renders a valid empty svg instead of throwing', () => {
  const empty = layout({ direction: 'LR', nodes: [], edges: [], subgraphs: [], warnings: [] });
  assert.ok(renderSvg(empty, opts).startsWith('<svg'));
});

test('style css uses the palette tokens and reaches no network', () => {
  const css = styleCss('executive-clean', deriveTokens(getPalette('harbor'), { dark: false }), 'standard');
  assert.ok(css.includes('--c1'));
  assert.ok(css.includes('.fm-node'));
  assert.equal(/https?:\/\//.test(css), false);
});

test('rendering is deterministic', () => {
  assert.equal(renderSvg(model, opts), renderSvg(model, opts));
});

// --- which swatch a node wears ---------------------------------------------

const toned = (src, opts = {}) => renderSvg(
  layout(parseMermaid(src), { layout: opts.layout ?? 'flow' }),
  { styleKey: 'executive-clean', palette: getPalette('harbor'), meta: {}, ...opts },
);
const tones = (svg) => [...svg.matchAll(/data-node-id="([^"]+)"[^>]*data-tone="(\d)"/g)]
  .map((m) => [m[1], Number(m[2])]);

test('every node declares the swatch it wears', () => {
  const svg = toned('flowchart LR\nA[Start] --> B{Choose?}\nB --> C([Done])');
  assert.deepEqual(tones(svg), [['A', 1], ['B', 2], ['C', 3]]);
});

test('colouring by level gives each rank its own swatch', () => {
  const svg = toned('flowchart TD\nA --> B\nB --> C\nC --> D\nD --> E', { colorBy: 'level' });
  assert.deepEqual(tones(svg).map(([, t]) => t), [1, 2, 3, 4, 1]);
});

test('colouring by group gives each lane its own swatch', () => {
  const src = [
    'flowchart LR',
    'subgraph ONE[Design]', 'A[Sketch]', 'end',
    'subgraph TWO[Build]', 'B[Ship]', 'end',
    'A --> B',
  ].join('\n');
  assert.deepEqual(tones(toned(src, { colorBy: 'group' })), [['A', 1], ['B', 2]]);
});

test('an author who writes :::c4 gets c4 whatever the mode', () => {
  const src = 'flowchart LR\nA[Start]:::c4 --> B{Choose?}';
  for (const colorBy of ['type', 'level', 'group']) {
    const found = tones(toned(src, { colorBy }));
    assert.deepEqual(found[0], ['A', 4], `mode ${colorBy} ignored the explicit swatch`);
  }
});

test('the default mode is the behaviour the diagrams already had', () => {
  const src = 'flowchart LR\nA[Start] --> B{Choose?}';
  assert.equal(toned(src), toned(src, { colorBy: 'type' }));
});

test('the swatch is a number the palette has', () => {
  const svg = toned('flowchart TD\nA --> B\nB --> C\nC --> D\nD --> E\nE --> F', { colorBy: 'level' });
  for (const [, t] of tones(svg)) assert.ok(t >= 1 && t <= 4);
});
