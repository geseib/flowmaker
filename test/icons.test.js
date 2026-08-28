import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ICONS, ICON_NAMES, ICON_GUIDE, ICON_ALIASES, showIcons, resolveIconName,
} from '../src/icons.js';


// --- the reference sheet ---------------------------------------------------

test('every icon is documented, and nothing is documented that does not exist', () => {
  for (const name of ICON_NAMES) {
    assert.ok(ICON_GUIDE[name], `${name} has no guidance, so nobody knows when to use it`);
  }
  for (const name of Object.keys(ICON_GUIDE)) {
    assert.ok(ICONS[name], `${name} is described but does not exist`);
  }
});

test('the guidance says what the icon is for, not what it looks like', () => {
  for (const [name, use] of Object.entries(ICON_GUIDE)) {
    assert.ok(use.length >= 20, `${name}: "${use}" is too thin to choose from`);
    assert.ok(use.length <= 120, `${name}: guidance is too long to scan`);
    assert.match(use, /\.$/, `${name}: guidance should read as a sentence`);
  }
});

test('the set covers who does the work, which is the distinction that matters most', () => {
  for (const name of ['human', 'agent', 'person', 'team']) {
    assert.ok(ICONS[name], `${name} is missing`);
  }
});

// --- the other names people reach for --------------------------------------

test('a name resolves to itself', () => {
  for (const name of ICON_NAMES) assert.equal(resolveIconName(name), name);
});

test('the short names people actually type resolve too', () => {
  assert.equal(resolveIconName('doc'), 'document');
  assert.equal(resolveIconName('robot'), 'agent');
  assert.equal(resolveIconName('bot'), 'agent');
  assert.equal(resolveIconName('payment'), 'money');
  assert.equal(resolveIconName('DOC'), 'document', 'and case does not matter');
  assert.equal(resolveIconName('  doc  '), 'document');
});

test('every alias points at an icon that exists', () => {
  for (const [alias, target] of Object.entries(ICON_ALIASES)) {
    assert.ok(ICONS[target], `${alias} points at missing icon ${target}`);
  }
});

test('a name that is not an icon resolves to nothing, rather than to something wrong', () => {
  for (const bad of ['banana', '', null, undefined, 'icon', '   ']) {
    assert.equal(resolveIconName(bad), null, `${bad} resolved to something`);
  }
});

// --- when icons are drawn --------------------------------------------------

test('by default only the style built around icons shows them', () => {
  assert.equal(showIcons('infographic', 'auto'), true);
  assert.equal(showIcons('blueprint', 'auto'), false);
  assert.equal(showIcons('bold-brutal'), false, 'and auto is the default');
});

test('a document can ask for icons whatever the style, or refuse them', () => {
  for (const key of ['blueprint', 'infographic', 'accent-rail']) {
    assert.equal(showIcons(key, 'on'), true, `${key} should show icons on request`);
    assert.equal(showIcons(key, 'off'), false, `${key} should be able to refuse them`);
  }
});

test('every icon is drawable geometry, not a placeholder', () => {
  for (const [name, markup] of Object.entries(ICONS)) {
    assert.match(markup, /^<(path|circle|rect|line|polyline|polygon|ellipse)/, `${name} does not start with a shape`);
    assert.equal(markup.includes('<script'), false);
    assert.equal(/https?:/.test(markup), false, `${name} reaches outside the file`);
    assert.equal(markup.includes('<image'), false, `${name} is not vector`);
  }
});
