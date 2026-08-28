// Which of the palette's four swatches a node wears.
//
// The palette chooses the colours; this chooses who gets which. Keeping the two
// apart is what lets an org chart colour by tier and a lane diagram colour by
// lane without either needing new colours, and it keeps every combination on
// the palette's derived contrast guarantees.

// Decision-ish and terminal-ish shapes, for the default mapping and for the
// styles that shape a diamond differently from a card.
const KIND = {
  rhombus: 'decision',
  hexagon: 'decision',
  circle: 'terminal',
  doublecircle: 'terminal',
  stadium: 'terminal',
};

export const kindOf = (shape) => KIND[shape] ?? 'process';

export const TONE_COUNT = 4;

const cycle = (i) => ((i % TONE_COUNT) + TONE_COUNT) % TONE_COUNT + 1;

// A class is a tag unless it is one of the names the tool has already claimed.
// Everything else — vp, contractor, vendor — is the author's own vocabulary.
const RESERVED = /^(c[1-4]|icon-[a-z0-9-]+)$/i;

export function tagsOf(node) {
  return (node.classes ?? []).map((c) => String(c).trim()).filter((c) => c && !RESERVED.test(c));
}

// The tags in the order they first appear, which is the order they are
// coloured in. Reading order decides, so the colours do not move when an
// unrelated node is added later.
export function tagOrder(model) {
  const seen = [];
  for (const n of model?.nodes ?? []) {
    for (const t of tagsOf(n)) if (!seen.includes(t)) seen.push(t);
  }
  return seen;
}

// An author who writes A:::c4 has made the decision themselves, in the diagram
// source, so it survives every mode and every palette.
function explicitTone(node) {
  for (const cls of node.classes ?? []) {
    const m = /^c([1-4])$/.exec(String(cls).trim());
    if (m) return Number(m[1]);
  }
  return null;
}

export function toneOf(node, mode = 'type', model = null) {
  const forced = explicitTone(node);
  if (forced) return forced;

  if (mode === 'level') return cycle(Number.isFinite(node.rank) ? node.rank : 0);

  if (mode === 'tag') {
    const order = tagOrder(model);
    const tag = tagsOf(node)[0];
    // An untagged node keeps the flow colour rather than borrowing a category
    // it was never put in.
    const i = tag ? order.indexOf(tag) : -1;
    return i === -1 ? 1 : cycle(i);
  }

  if (mode === 'group') {
    const groups = (model?.subgraphs ?? []).map((s) => s.id);
    const i = groups.indexOf(node.subgraph);
    // A node outside every group keeps the flow colour rather than joining one.
    return i === -1 ? 1 : cycle(i);
  }

  const kind = kindOf(node.shape);
  if (kind === 'decision') return 2;
  if (kind === 'terminal') return 3;
  return 1;
}
