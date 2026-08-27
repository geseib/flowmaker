import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildEmbed, scopeCss } from '../src/embed.js';
import { resolveDocument } from '../src/app.js';
import { STYLE_KEYS } from '../src/constants.js';

const doc = resolveDocument(readFileSync(new URL('../samples/order-processing.md', import.meta.url), 'utf8'));
const make = (over = {}) => buildEmbed({
  meta: doc.meta,
  model: doc.model,
  details: doc.details,
  styleKey: doc.meta.style,
  paletteKey: doc.meta.palette,
  density: doc.meta.density,
  animationMode: 'pulse',
  ...over,
});

// --- scoping ---------------------------------------------------------------

test('every rule is confined to the scope', () => {
  const out = scopeCss('.fm-node { fill: red; } .fm-edge, .fm-arrow { stroke: blue; }', '#x');
  assert.ok(out.includes('#x .fm-node'));
  assert.ok(out.includes('#x .fm-edge'));
  assert.ok(out.includes('#x .fm-arrow'));
  assert.equal(/(^|[^x])\s\.fm-node\s*\{/.test(out.replace(/#x/g, 'x')), false);
});

test('the token holder becomes the wrapper itself, not a descendant', () => {
  const out = scopeCss('.fm-root { --c1: red; } .fm-root .fm-node { fill: red; }', '#x');
  assert.ok(out.startsWith('#x{'), `expected the wrapper to carry the tokens, got: ${out.slice(0, 40)}`);
  assert.ok(out.includes('#x .fm-node'));
});

test('rules inside a media query are scoped, and the query survives', () => {
  const out = scopeCss('@media (prefers-reduced-motion: reduce) { .fm-pulse { display: none; } }', '#x');
  assert.ok(out.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(out.includes('#x .fm-pulse'));
});

test('keyframes pass through untouched', () => {
  const out = scopeCss('@keyframes fm-travel { from { offset-distance: 0%; } }', '#x');
  assert.ok(out.includes('@keyframes fm-travel'));
  assert.equal(out.includes('#x from'), false, 'keyframe steps are not selectors');
});

test('comments containing braces do not derail the parse', () => {
  const out = scopeCss('/* a { brace } in a comment */ .fm-node { fill: red; }', '#x');
  assert.ok(out.includes('#x .fm-node'));
  assert.equal(out.includes('comment'), false);
});

test('scoping is deterministic', () => {
  const css = '.fm-root { --c1: red; } @media screen { .fm-edge { stroke: blue; } }';
  assert.equal(scopeCss(css, '#x'), scopeCss(css, '#x'));
});

// --- the snippet -----------------------------------------------------------

test('the snippet carries no interface and no script', () => {
  const html = make();
  assert.equal(/<script/i.test(html), false, 'an embed must not ship script');
  assert.equal(/<button/i.test(html), false, 'an embed must not ship controls');
  assert.equal(/<!doctype/i.test(html), false, 'it is a fragment, not a page');
  assert.equal(/<html|<body|<head/i.test(html), false);
});

test('it is a fragment with one wrapper that owns its styles', () => {
  const html = make();
  const id = html.match(/<div id="(fm-[a-z0-9]+)"/)?.[1];
  assert.ok(id, 'the wrapper needs an id to scope against');
  assert.ok(html.includes(`#${id} .fm-node-shape`), 'style rules must be scoped to it');
  assert.ok(html.trimStart().startsWith('<div'));
  assert.ok(html.trimEnd().endsWith('</div>'));
});

test('it reaches no network', () => {
  const html = make();
  assert.equal(/https?:\/\//.test(html.replace(/xmlns="[^"]*"/g, '')), false);
  assert.equal(html.includes('@import'), false);
  assert.equal(html.includes('data:image'), false);
});

test('the choices are baked in, not left to the host page', () => {
  const marquee = make({ density: 'marquee' });
  const compact = make({ density: 'compact' });
  assert.notEqual(marquee, compact, 'density must change the output');
  const brutal = make({ styleKey: 'bold-brutal' });
  const info = make({ styleKey: 'infographic' });
  assert.notEqual(brutal, info, 'style must change the output');
  assert.ok(info.includes('fm-node-icon'), 'infographic keeps its icons');
});

test('every style produces a valid snippet', () => {
  for (const styleKey of STYLE_KEYS) {
    const html = make({ styleKey });
    assert.ok(html.includes('<svg'), `${styleKey} produced no diagram`);
    assert.equal(/<script/i.test(html), false, `${styleKey} leaked a script`);
  }
});

test('step summaries survive as native tooltips, since there is no script', () => {
  const html = make();
  const first = Object.values(doc.details)[0];
  assert.ok(html.includes(`<title>${first.tooltip}`), 'the tooltip should become a title element');
});

test('the pulse is pre-drawn so it animates without script', () => {
  const html = make({ animationMode: 'pulse' });
  assert.ok(html.includes('fm-travel'), 'the travel keyframes must be included');
  assert.ok(html.includes('offset-path'), 'the dots need their motion paths');
  const still = make({ animationMode: 'off' });
  assert.equal(still.includes('offset-path'), false, 'a still diagram carries no pulse');
});

test('two different diagrams get different wrappers, so they can share a page', () => {
  const a = make({ styleKey: 'blueprint' });
  const b = make({ styleKey: 'soft-depth', meta: { ...doc.meta, title: 'Another Flow' } });
  const idA = a.match(/id="(fm-[a-z0-9]+)"/)[1];
  const idB = b.match(/id="(fm-[a-z0-9]+)"/)[1];
  assert.notEqual(idA, idB);
});

test('the same document always produces the same snippet', () => {
  assert.equal(make(), make());
});
