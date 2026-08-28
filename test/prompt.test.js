import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthoringPrompt, AUTHORING_PROMPT } from '../src/prompt.js';
import { STYLE_KEYS, DENSITY_KEYS, DIRECTION_KEYS, LOOP_KEYS, COLOR_BY_KEYS, DEFAULTS } from '../src/constants.js';
import { PALETTES } from '../src/palettes.js';
import { ICON_NAMES } from '../src/icons.js';
import { parseDocument } from '../src/parse.js';
import { parseMermaid } from '../src/mermaid.js';

const prompt = AUTHORING_PROMPT;

// The point of generating the prompt is that it cannot drift from the code.
// These assertions fail the moment a style, palette, or icon is added without
// the instructions following.
test('every valid style, palette, direction, density, and loop mode is listed', () => {
  for (const v of STYLE_KEYS) assert.ok(prompt.includes(v), `style "${v}" is missing from the prompt`);
  for (const p of PALETTES) assert.ok(prompt.includes(p.key), `palette "${p.key}" is missing`);
  for (const v of DIRECTION_KEYS) assert.ok(prompt.includes(v), `direction "${v}" is missing`);
  for (const v of DENSITY_KEYS) assert.ok(prompt.includes(v), `density "${v}" is missing`);
  for (const v of LOOP_KEYS) assert.ok(prompt.includes(v), `loop mode "${v}" is missing`);
});

test('every icon name is listed, so an author can force one', () => {
  for (const name of ICON_NAMES) {
    assert.ok(prompt.includes(name), `icon "${name}" is missing from the prompt`);
  }
});

test('the defaults shown in the example are the real defaults', () => {
  assert.ok(prompt.includes(`style: ${DEFAULTS.style}`));
  assert.ok(prompt.includes(`palette: ${DEFAULTS.palette}`));
  assert.ok(prompt.includes(`density: ${DEFAULTS.density}`));
  assert.ok(prompt.includes(`loops: ${DEFAULTS.loops}`));
});

test('it tells the assistant to interview before writing', () => {
  const head = prompt.slice(0, prompt.indexOf('## Then write the file'));
  assert.ok(/interview/i.test(head), 'the prompt must ask for an interview first');
  assert.ok(/Do not write the file yet/i.test(head));
  for (const topic of ['decision', 'end state', 'backwards', 'owns', 'out of scope']) {
    assert.ok(new RegExp(topic, 'i').test(head), `the interview should cover "${topic}"`);
  }
});

test('it states the rules the conformance tests enforce', () => {
  assert.ok(/case-sensitive/i.test(prompt), 'node ids are case-sensitive');
  assert.ok(/first blockquote/i.test(prompt), 'the tooltip rule');
  assert.ok(/20 to 160/.test(prompt), 'the tooltip length guidance');
  assert.ok(/one .*section per node/i.test(prompt), 'one section per node');
  assert.ok(/Exactly one/i.test(prompt), 'exactly one mermaid block');
});

test('it asks the assistant to flag its guesses', () => {
  assert.ok(/unsure|guess/i.test(prompt.slice(-400)));
});

// The example inside the prompt has to be a document FlowMaker actually accepts.
test('the worked example in the prompt parses as a valid document', () => {
  // Match a closing fence that is exactly three backticks on its own: the
  // nested mermaid block is written with four, and a lazy match would stop at
  // its first three.
  const fence = prompt.match(/```markdown\n([\s\S]*?)\n```[ \t]*(?:\n|$)/);
  assert.ok(fence, 'the prompt must contain a markdown example');
  // Inside the prompt the nested mermaid block is written with four backticks
  // so it survives nesting; restore it before parsing.
  const example = fence[1].replace(/````/g, '```');

  const doc = parseDocument(example);
  assert.deepEqual(doc.warnings, [], `example warnings: ${JSON.stringify(doc.warnings)}`);
  assert.equal(doc.meta.style, DEFAULTS.style);
  assert.ok(doc.mermaidSrc.startsWith('flowchart LR'));

  const graph = parseMermaid(doc.mermaidSrc);
  assert.deepEqual(graph.warnings, []);
  assert.ok(graph.nodes.length >= 5, 'the example should show a real flow');
  assert.ok(graph.edges.some((e) => e.from === 'RETRY' && e.to === 'AUTH'),
    'the example should demonstrate a loop-back');

  // The one section the example spells out must bind to a real node.
  assert.ok('START' in doc.details, 'the example section must match a node id');
  assert.ok(doc.details.START.tooltip.length >= 20);
  assert.ok(doc.details.START.tooltip.length <= 160);
});

test('the prompt is generated fresh and is deterministic', () => {
  assert.equal(buildAuthoringPrompt(), buildAuthoringPrompt());
  assert.equal(buildAuthoringPrompt(), AUTHORING_PROMPT);
});

test('it explains the org chart layout and its one hard rule', () => {
  const p = buildAuthoringPrompt();
  assert.match(p, /layout: tree|`tree`/, 'the tree layout must be named');
  assert.match(p, /exactly one box above it/, 'the hierarchy rule must be stated');
  assert.match(p, /<br\/>/, 'the name-over-role break must be shown');
  assert.match(p, /direction: TD/);
  assert.ok(p.includes('Org charts'), 'org charts need their own section');
});

test('it asks a different set of questions for a hierarchy', () => {
  const p = buildAuthoringPrompt();
  const section = p.slice(p.indexOf('## Org charts'), p.indexOf('## Colour'));
  assert.match(section, /reports to/i);
  assert.match(section, /own/i);
  assert.ok(section.includes('?'), 'it must actually ask something');
});

test('it explains how to choose which nodes wear which colour', () => {
  const p = buildAuthoringPrompt();
  for (const mode of COLOR_BY_KEYS) {
    assert.ok(p.includes(`\`${mode}\``), `colouring mode ${mode} is undocumented`);
  }
  assert.match(p, /:::c4/, 'the per-node override must be shown');
});

test('the frontmatter example carries every key the tool reads', () => {
  const p = buildAuthoringPrompt();
  for (const key of ['style', 'palette', 'direction', 'density', 'loops', 'layout', 'colorBy']) {
    assert.match(p, new RegExp(`^${key}: `, 'm'), `${key} is missing from the example`);
  }
});
