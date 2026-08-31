import { attachmentIconFor } from './icons.js';

// A step's inputs and outputs: the documents, data stores, and services it takes
// in and puts out. They are not steps — they take no rank, they change nothing
// about where anything sits, and turning them on leaves the diagram identical.
//
// Authoring uses no new syntax: a node tagged `:::input` or `:::output` is an
// attachment of whichever step it connects to, and the arrow the author already
// drew says which way it points.
export const ATTACH_TAGS = ['input', 'output'];

export const directionOf = (node) => {
  const classes = (node?.classes ?? []).map((c) => String(c).trim().toLowerCase());
  if (classes.includes('input')) return 'in';
  if (classes.includes('output')) return 'out';
  return null;
};

// Splits a graph into the flow and what hangs off it.
//
// A node is lifted only when it is tagged and has exactly one edge, joining it
// to something that is not itself an attachment. Anything else stays a step and
// is reported: silently dropping a relationship the author drew would be worse
// than drawing it plainly.
export function liftAttachments(graph) {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const tagged = new Map();
  for (const n of nodes) {
    const dir = directionOf(n);
    if (dir) tagged.set(n.id, dir);
  }
  if (tagged.size === 0) {
    return { graph, attachments: new Map(), warnings: [] };
  }

  const touching = new Map([...tagged.keys()].map((id) => [id, []]));
  for (const e of edges) {
    if (touching.has(e.from)) touching.get(e.from).push(e);
    if (touching.has(e.to)) touching.get(e.to).push(e);
  }

  const warnings = [];
  const lifted = new Set();
  const attachments = new Map();

  for (const [id, dir] of tagged) {
    const own = touching.get(id) ?? [];
    const node = nodes.find((n) => n.id === id);

    if (own.length === 0) {
      warnings.push({
        code: 'ATTACHMENT_NOT_ATTACHED',
        message: `"${id}" is marked as an ${dir === 'in' ? 'input' : 'output'} but is not connected to a step, so it is drawn as one.`,
      });
      continue;
    }

    const chained = own.find((e) => tagged.has(e.from === id ? e.to : e.from));
    if (chained) {
      const other = chained.from === id ? chained.to : chained.from;
      warnings.push({
        code: 'ATTACHMENT_CHAIN',
        message: `"${id}" is attached to "${other}", which is itself an attachment, so both are drawn as steps.`,
      });
      continue;
    }

    // A service used by several steps is the ordinary case — one Controls MCP
    // feeding three of them — so the count is not what disqualifies it. What
    // disqualifies it is arrows both ways: something consumed by one step and
    // produced by another is standing in the middle of the flow, and that is a
    // step, whatever it has been tagged.
    const consumed = own.every((e) => e.from === id);
    const produced = own.every((e) => e.to === id);
    if (!consumed && !produced) {
      warnings.push({
        code: 'ATTACHMENT_PASSES_THROUGH',
        message: `"${id}" is marked as an ${dir === 'in' ? 'input' : 'output'} but work passes through it, so it is drawn as a step.`,
      });
      continue;
    }

    lifted.add(id);
    const card = {
      id,
      label: node.label ?? id,
      icon: attachmentIconFor(node),
      // The arrows the author drew decide the direction; the tag only says that
      // this is an attachment at all. Where the two disagree the arrows win,
      // because those are what the mermaid on GitHub shows.
      direction: consumed ? 'in' : 'out',
    };
    // One declaration, a card on every step that uses it.
    for (const e of own) {
      const hostId = e.from === id ? e.to : e.from;
      if (!attachments.has(hostId)) attachments.set(hostId, []);
      attachments.get(hostId).push({ ...card });
    }
  }

  if (lifted.size === 0) return { graph, attachments: new Map(), warnings };

  return {
    graph: {
      ...graph,
      nodes: nodes.filter((n) => !lifted.has(n.id)),
      edges: edges.filter((e) => !lifted.has(e.from) && !lifted.has(e.to)),
      subgraphs: (graph.subgraphs ?? []).map((sg) => ({
        ...sg,
        nodeIds: sg.nodeIds.filter((id) => !lifted.has(id)),
      })),
    },
    attachments,
    warnings,
  };
}

export const BAND = {
  card: { w: 168, h: 78, gap: 14, min: 104 },
  // How far the band sits from the step, leaving the arrows somewhere to run.
  standoff: 92,
  max: 4,
  edge: 16,
};

// Where the band goes and what sits in it. Pure, so the arrangement can be
// checked without a browser: the band never covers the step it describes, and
// it stays inside the viewport.
export function bandLayout({ node, viewport, items, horizontal = true }) {
  const shown = (items ?? []).slice(0, BAND.max);
  const overflow = Math.max(0, (items ?? []).length - shown.length);
  if (shown.length === 0) return { side: null, cards: [], overflow: 0 };

  const ins0 = shown.filter((a) => a.direction === 'in').length;
  const outs0 = shown.length - ins0;
  // The widest group has to fit in half the view, or the cards are narrowed
  // until it does. Clamping each card into view independently would slide them
  // on top of one another, which is worse than a narrower card.
  const halfView = (horizontal ? viewport.width : viewport.height) / 2 - BAND.edge * 2;
  const widest = Math.max(ins0, outs0, 1);
  const natural = horizontal ? BAND.card.w : BAND.card.h;
  const fitted = Math.max(
    BAND.card.min,
    Math.min(natural, Math.floor((halfView - (widest - 1) * BAND.card.gap) / widest)),
  );
  const card = horizontal
    ? { ...BAND.card, w: fitted }
    : { ...BAND.card, h: fitted };
  const ins = shown.filter((a) => a.direction === 'in');
  const outs = shown.filter((a) => a.direction !== 'in');

  if (horizontal) {
    // Above by default; below when the step sits too high for the band to fit.
    const room = node.top - viewport.top;
    const side = room >= card.h + BAND.standoff ? 'top' : 'bottom';
    const y = side === 'top'
      ? Math.max(viewport.top + BAND.edge, node.top - BAND.standoff - card.h)
      : Math.min(viewport.bottom - BAND.edge - card.h, node.bottom + BAND.standoff);

    // Inputs left of the step, outputs right: the flow reads that way, so
    // position and arrow direction say the same thing.
    const centre = node.left + node.width / 2;
    const lay = (group, dir) => group.map((a, i) => {
      const span = group.length * card.w + Math.max(0, group.length - 1) * card.gap;
      const start = dir === 'in'
        ? centre - card.gap / 2 - span
        : centre + card.gap / 2;
      return { ...a, x: start + i * (card.w + card.gap), y, w: card.w, h: card.h };
    });

    // A group is nudged back into view as a unit: moving one card of it would
    // close the gap to its neighbour.
    const shift = (group) => {
      if (group.length === 0) return group;
      const left = Math.min(...group.map((c) => c.x));
      const right = Math.max(...group.map((c) => c.x + c.w));
      const by = left < viewport.left + BAND.edge
        ? viewport.left + BAND.edge - left
        : Math.min(0, viewport.right - BAND.edge - right);
      return group.map((c) => ({ ...c, x: c.x + by }));
    };
    const cards = [...shift(lay(ins, 'in')), ...shift(lay(outs, 'out'))];
    return { side, cards, overflow };
  }

  // A vertical flow leaves its whitespace at the sides, so the band goes there.
  const room = viewport.right - node.right;
  const side = room >= card.w + BAND.standoff ? 'right' : 'left';
  const x = side === 'right'
    ? Math.min(viewport.right - BAND.edge - card.w, node.right + BAND.standoff)
    : Math.max(viewport.left + BAND.edge, node.left - BAND.standoff - card.w);

  const middle = node.top + node.height / 2;
  const lay = (group, dir) => group.map((a, i) => {
    const span = group.length * card.h + Math.max(0, group.length - 1) * card.gap;
    const start = dir === 'in'
      ? middle - card.gap / 2 - span
      : middle + card.gap / 2;
    return { ...a, x, y: start + i * (card.h + card.gap), w: card.w, h: card.h };
  });

  const shift = (group) => {
    if (group.length === 0) return group;
    const top = Math.min(...group.map((c) => c.y));
    const bottom = Math.max(...group.map((c) => c.y + c.h));
    const by = top < viewport.top + BAND.edge
      ? viewport.top + BAND.edge - top
      : Math.min(0, viewport.bottom - BAND.edge - bottom);
    return group.map((c) => ({ ...c, y: c.y + by }));
  };
  const cards = [...shift(lay(ins, 'in')), ...shift(lay(outs, 'out'))];
  return { side, cards, overflow };
}
