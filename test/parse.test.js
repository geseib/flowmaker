import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument, replaceMermaidBlock } from '../src/parse.js';

const DOC = [
  '---',
  'title: Order Processing',
  'style: neon-circuit',
  '---',
  '',
  '```mermaid',
  'flowchart LR',
  '  A[Cart] --> B{Paid?}',
  '```',
  '',
  '## A — Cart Checkout',
  '> Customer confirms the cart.',
  '',
  '**Owner:** Storefront',
  '',
  '## B - Paid?',
  'Gateway auth for the total.',
  '',
  'Retries twice.',
].join('\n');

test('reads frontmatter, the mermaid block, and the detail sections', () => {
  const { meta, mermaidSrc, details, warnings } = parseDocument(DOC);
  assert.equal(meta.title, 'Order Processing');
  assert.equal(meta.style, 'neon-circuit');
  assert.equal(mermaidSrc, 'flowchart LR\n  A[Cart] --> B{Paid?}');
  assert.deepEqual(warnings, []);
  assert.equal(details.A.title, 'Cart Checkout');
  assert.equal(details.B.title, 'Paid?', 'a spaced hyphen also separates id from title');
});

test('the first blockquote is the tooltip and is kept out of the body', () => {
  const { details } = parseDocument(DOC);
  assert.equal(details.A.tooltip, 'Customer confirms the cart.');
  assert.equal(details.A.bodyMd, '**Owner:** Storefront');
});

test('with no blockquote the first paragraph is the tooltip', () => {
  const { details } = parseDocument(DOC);
  assert.equal(details.B.tooltip, 'Gateway auth for the total.');
  assert.ok(details.B.bodyMd.includes('Retries twice.'));
});

test('a missing mermaid block warns instead of throwing', () => {
  const { mermaidSrc, warnings } = parseDocument('# Prose only\n');
  assert.equal(mermaidSrc, '');
  assert.equal(warnings[0].code, 'NO_MERMAID_BLOCK');
});

test('a second mermaid block is ignored with a warning', () => {
  const src = '```mermaid\nflowchart LR\nA-->B\n```\n\n```mermaid\nflowchart TD\nC-->D\n```\n';
  const { mermaidSrc, warnings } = parseDocument(src);
  assert.equal(mermaidSrc, 'flowchart LR\nA-->B');
  assert.ok(warnings.some((w) => w.code === 'EXTRA_MERMAID_BLOCK'));
});

test('non-mermaid fenced code stays in the detail section', () => {
  const src = '```mermaid\nflowchart LR\nA-->B\n```\n\n## A — Step\n> Tip.\n\n```json\n{"k": 1}\n```\n';
  const { details } = parseDocument(src);
  assert.ok(details.A.bodyMd.includes('{"k": 1}'));
});

test('parsing is deterministic', () => {
  assert.deepEqual(parseDocument(DOC), parseDocument(DOC));
});

// --- editing the mermaid on its own ---------------------------------------

test('replacing the mermaid leaves frontmatter and details untouched', () => {
  const next = replaceMermaidBlock(DOC, 'flowchart LR\n  X --> Y');
  const doc = parseDocument(next);
  assert.equal(doc.mermaidSrc, 'flowchart LR\n  X --> Y');
  assert.equal(doc.meta.title, 'Order Processing');
  assert.equal(doc.meta.style, 'neon-circuit');
  assert.equal(doc.details.A.tooltip, 'Customer confirms the cart.');
  assert.ok('B' in doc.details);
});

test('replacing the mermaid is idempotent', () => {
  const once = replaceMermaidBlock(DOC, 'flowchart LR\nX --> Y');
  assert.equal(replaceMermaidBlock(once, 'flowchart LR\nX --> Y'), once);
});

test('a document with no mermaid block gets one inserted after the frontmatter', () => {
  const src = '---\ntitle: Bare\n---\n\n## A — Step\n> Tip.\n';
  const out = replaceMermaidBlock(src, 'flowchart LR\nA --> B');
  const doc = parseDocument(out);
  assert.equal(doc.mermaidSrc, 'flowchart LR\nA --> B');
  assert.equal(doc.meta.title, 'Bare');
  assert.equal(doc.details.A.tooltip, 'Tip.');
});

test('a document with neither frontmatter nor mermaid still gets a block', () => {
  const out = replaceMermaidBlock('## A — Step\n> Tip.\n', 'flowchart LR\nA --> B');
  assert.equal(parseDocument(out).mermaidSrc, 'flowchart LR\nA --> B');
});

test('replacing with empty mermaid does not corrupt the document', () => {
  const out = replaceMermaidBlock(DOC, '');
  const doc = parseDocument(out);
  assert.equal(doc.meta.title, 'Order Processing');
  assert.ok('A' in doc.details);
});
