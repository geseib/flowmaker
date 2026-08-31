import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from '../src/parse.js';
import { parseMermaid } from '../src/mermaid.js';
import { liftAttachments } from '../src/attachments.js';
import { layout } from '../src/layout.js';
import { renderSvg } from '../src/render.js';
import { PALETTES, getPalette } from '../src/palettes.js';
import { STYLE_KEYS, DENSITY_KEYS, DIRECTION_KEYS, LAYOUT_KEYS } from '../src/constants.js';

const DIR = fileURLToPath(new URL('../samples/', import.meta.url));
const files = readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();

test('the samples directory holds every sample', () => {
  assert.equal(files.length, 6, `expected six samples, found ${files.length}`);
});

for (const file of files) {
  const md = readFileSync(join(DIR, file), 'utf8');
  const doc = parseDocument(md);
  // Inputs and outputs are not steps: they take no rank and need no detail
  // section, so the conformance checks below run on the flow itself.
  const parsed = parseMermaid(doc.mermaidSrc);
  const { graph, attachments } = liftAttachments(parsed);

  test(`${file}: parses with no warnings`, () => {
    assert.deepEqual(doc.warnings, [], `document warnings: ${JSON.stringify(doc.warnings)}`);
    assert.deepEqual(parsed.warnings, [], `mermaid warnings: ${JSON.stringify(parsed.warnings)}`);
    assert.deepEqual(liftAttachments(parsed).warnings, [], 'attachment warnings');
  });

  test(`${file}: frontmatter is complete and every value is valid`, () => {
    assert.ok(doc.meta.title, 'title is required');
    assert.ok(doc.meta.subtitle, 'subtitle is required');
    assert.ok(STYLE_KEYS.includes(doc.meta.style), `unknown style ${doc.meta.style}`);
    assert.ok(PALETTES.some((p) => p.key === doc.meta.palette), `unknown palette ${doc.meta.palette}`);
    assert.ok(DENSITY_KEYS.includes(doc.meta.density), `unknown density ${doc.meta.density}`);
    assert.ok(DIRECTION_KEYS.includes(doc.meta.direction), `unknown direction ${doc.meta.direction}`);
    if (doc.meta.layout) assert.ok(LAYOUT_KEYS.includes(doc.meta.layout), `unknown layout ${doc.meta.layout}`);
    // Flows read horizontally; a hierarchy reads top down.
    const expected = doc.meta.layout === 'tree' ? 'TD' : 'LR';
    assert.equal(doc.meta.direction, expected);
  });

  test(`${file}: has a substantial graph`, () => {
    assert.ok(graph.nodes.length >= 8, `expected at least 8 nodes, got ${graph.nodes.length}`);
    assert.ok(graph.edges.length >= graph.nodes.length - 1);
  });

  test(`${file}: every node has a detail section with a tooltip and a modal body`, () => {
    for (const n of graph.nodes) {
      const d = doc.details[n.id];
      assert.ok(d, `node "${n.id}" (${n.label}) has no "## ${n.id} — ..." section`);
      assert.ok(d.tooltip.length >= 20, `tooltip for "${n.id}" is too short: "${d.tooltip}"`);
      assert.ok(d.tooltip.length <= 160, `tooltip for "${n.id}" is too long (${d.tooltip.length})`);
      assert.ok(d.bodyMd.length >= 80, `modal body for "${n.id}" is too thin`);
    }
  });

  test(`${file}: every detail section matches a real node`, () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const id of Object.keys(doc.details)) {
      assert.ok(ids.has(id), `detail section "${id}" matches no node in the diagram`);
    }
  });

  test(`${file}: lays out and renders in every style and density`, () => {
    for (const density of DENSITY_KEYS) {
      const model = layout(graph, { density, layout: doc.meta.layout ?? 'flow' });
      assert.equal(model.nodes.length, graph.nodes.length);
      for (let i = 0; i < model.nodes.length; i += 1) {
        for (let j = i + 1; j < model.nodes.length; j += 1) {
          const a = model.nodes[i];
          const b = model.nodes[j];
          const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          assert.equal(hit, false, `${file} @${density}: ${a.id} overlaps ${b.id}`);
        }
      }
      for (const styleKey of STYLE_KEYS) {
        const svg = renderSvg(model, {
          styleKey,
          palette: getPalette(doc.meta.palette),
          meta: doc.meta,
          details: doc.details,
        });
        assert.ok(svg.startsWith('<svg'), `${file} @${density}/${styleKey} did not render`);
      }
    }
  });

  test(`${file}: every attachment hangs off a step that exists`, () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const hostId of attachments.keys()) {
      assert.ok(ids.has(hostId), `${file}: attachment hangs off "${hostId}", which is not a step`);
    }
  });
}