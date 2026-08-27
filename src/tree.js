import { DENSITY } from './constants.js';
import { round, estimateTextSize, roundedPath } from './geometry.js';


// An org chart is a tree, not a layered graph: every box hangs from exactly one
// box above it, siblings sit side by side, and a parent is centred over the
// span its descendants occupy. A node with two parents is a graph, and a cycle
// is not a hierarchy at all, so both are reported rather than drawn wrong.
export function inspectTree(graph) {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  if (nodes.length === 0) return { ok: false, code: 'EMPTY', message: 'There is nothing to arrange.' };

  const parents = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (e.from === e.to) {
      return {
        ok: false,
        code: 'SELF_LINK',
        message: `"${e.from}" reports to itself, which is not a hierarchy.`,
      };
    }
    if (parents.has(e.to)) parents.get(e.to).push(e.from);
  }

  const shared = [...parents.entries()].filter(([, list]) => list.length > 1);
  if (shared.length) {
    const [id, list] = shared[0];
    return {
      ok: false,
      code: 'MULTIPLE_PARENTS',
      message: `"${id}" reports to more than one box (${list.join(', ')}), so this is a graph rather than a chart.`,
    };
  }

  const roots = nodes.filter((n) => (parents.get(n.id) ?? []).length === 0);
  if (roots.length === 0) {
    return { ok: false, code: 'NO_ROOT', message: 'Every box reports to another, so the chart has no top.' };
  }

  // Everything must be reachable from a root; anything left over sits in a cycle.
  const children = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) if (children.has(e.from)) children.get(e.from).push(e.to);
  const seen = new Set();
  const stack = roots.map((r) => r.id);
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of children.get(id) ?? []) stack.push(next);
  }
  if (seen.size !== nodes.length) {
    const stranded = nodes.filter((n) => !seen.has(n.id)).map((n) => n.id);
    return {
      ok: false,
      code: 'CYCLE',
      message: `These boxes form a loop and never reach the top: ${stranded.join(', ')}.`,
    };
  }

  return { ok: true, roots, children };
}

// Lay the chart out by measuring each subtree and centring every box over the
// span its own descendants take up. Simple and predictable: boxes never
// overlap, and a branch's shape does not change when a distant branch grows.
export function treeLayout(graph, opts = {}) {
  const direction = opts.direction ?? graph.direction ?? 'TD';
  const densityKey = opts.density ?? 'standard';
  const spec = DENSITY[densityKey] ?? DENSITY.standard;
  const measure = opts.measure ?? ((label) => estimateTextSize(label, spec));
  const vertical = direction === 'TD' || direction === 'BT';

  const info = inspectTree(graph);
  const nodes = graph.nodes.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (const n of nodes) {
    const size = measure(n.label, spec);
    n.w = size.w;
    n.h = size.h;
  }

  const childIds = new Map(nodes.map((n) => [n.id, []]));
  for (const e of graph.edges) {
    if (e.from !== e.to && childIds.has(e.from) && byId.has(e.to)) childIds.get(e.from).push(e.to);
  }
  const roots = info.ok ? info.roots : nodes.filter((n) => n === nodes[0]);

  // Along the chart's own axis, boxes on the same level share a row or column.
  const siblingGap = spec.laneGap;
  const levelGap = Math.round(spec.rankGap * 0.62);
  const across = (n) => (vertical ? n.w : n.h);
  const along = (n) => (vertical ? n.h : n.w);

  const spanCache = new Map();
  function span(id) {
    if (spanCache.has(id)) return spanCache.get(id);
    const node = byId.get(id);
    const kids = childIds.get(id) ?? [];
    let total = across(node);
    if (kids.length) {
      const kidsTotal = kids.reduce((sum, k) => sum + span(k), 0) + siblingGap * (kids.length - 1);
      total = Math.max(total, kidsTotal);
    }
    spanCache.set(id, total);
    return total;
  }

  // Each level is as deep as its tallest box, so rows stay tight.
  const depthOf = new Map();
  for (const r of roots) {
    (function walk(id, depth) {
      depthOf.set(id, depth);
      for (const k of childIds.get(id) ?? []) walk(k, depth + 1);
    })(r.id, 0);
  }
  const levelSize = new Map();
  for (const n of nodes) {
    const d = depthOf.get(n.id) ?? 0;
    levelSize.set(d, Math.max(levelSize.get(d) ?? 0, along(n)));
  }
  const levelStart = new Map();
  let cursor = 0;
  for (const d of [...levelSize.keys()].sort((a, b) => a - b)) {
    levelStart.set(d, cursor);
    cursor += levelSize.get(d) + levelGap;
  }
  const alongExtent = Math.max(0, cursor - levelGap);

  const centreOf = (n) => (vertical ? n.x + n.w / 2 : n.y + n.h / 2);

  function place(id, start) {
    const node = byId.get(id);
    const total = span(id);
    const depth = depthOf.get(id) ?? 0;
    const alongPos = levelStart.get(depth) + (levelSize.get(depth) - along(node)) / 2;
    node.rank = depth;

    // Children first, so the parent can be hung over them.
    const kids = childIds.get(id) ?? [];
    const kidsTotal = kids.reduce((sum, k) => sum + span(k), 0) + siblingGap * Math.max(0, kids.length - 1);
    let at = start + (total - kidsTotal) / 2;
    kids.forEach((k, i) => {
      place(k, at);
      byId.get(k).order = i;
      at += span(k) + siblingGap;
    });

    // A box sits over the middle of its first and last report, which is what
    // makes a chart look hung rather than merely stacked. Centring it over the
    // whole subtree instead pulls it off to one side whenever the branches
    // beneath it are different widths.
    const acrossPos = kids.length
      ? (centreOf(byId.get(kids[0])) + centreOf(byId.get(kids.at(-1)))) / 2 - across(node) / 2
      : start + (total - across(node)) / 2;

    if (vertical) {
      node.x = acrossPos;
      node.y = alongPos;
    } else {
      node.y = acrossPos;
      node.x = alongPos;
    }
  }

  let acrossCursor = 0;
  roots.forEach((r, i) => {
    place(r.id, acrossCursor);
    r.order = i;
    acrossCursor += span(r.id) + siblingGap * 2;
  });
  const acrossExtent = Math.max(0, acrossCursor - siblingGap * 2);

  if (direction === 'BT' || direction === 'RL') {
    for (const n of nodes) {
      if (vertical) n.y = alongExtent - n.y - n.h;
      else n.x = alongExtent - n.x - n.w;
    }
  }

  for (const n of nodes) {
    n.x = round(n.x);
    n.y = round(n.y);
    n.rank = n.rank ?? 0;
    n.order = n.order ?? 0;
  }

  // The reporting line: straight out of the parent, along a shared bus, then
  // straight into the child. It is what makes a chart read as a hierarchy.
  const corner = Math.min(spec.corner, levelGap / 2, 14);
  const edges = graph.edges.map((e) => {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to) return { ...e, isBackEdge: false, isWrap: false, path: '', labelPos: { x: 0, y: 0 } };

    const points = vertical
      ? busPoints(
        { x: from.x + from.w / 2, y: direction === 'BT' ? from.y : from.y + from.h },
        { x: to.x + to.w / 2, y: direction === 'BT' ? to.y + to.h : to.y },
      )
      : busPoints(
        { x: direction === 'RL' ? from.x : from.x + from.w, y: from.y + from.h / 2 },
        { x: direction === 'RL' ? to.x + to.w : to.x, y: to.y + to.h / 2 },
        true,
      );

    const mid = points[1];
    return {
      ...e,
      isBackEdge: false,
      isWrap: false,
      path: roundedPath(points, corner),
      labelPos: { x: round(mid.x), y: round(mid.y) },
    };
  });

  function busPoints(a, b, horizontal = false) {
    if (horizontal) {
      const midX = (a.x + b.x) / 2;
      return [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b];
    }
    const midY = (a.y + b.y) / 2;
    return [a, { x: a.x, y: midY }, { x: b.x, y: midY }, b];
  }

  const right = Math.max(...nodes.map((n) => n.x + n.w));
  const bottom = Math.max(...nodes.map((n) => n.y + n.h));

  return {
    nodes,
    edges,
    subgraphs: [],
    direction,
    density: densityKey,
    layout: 'tree',
    bounds: {
      w: round(right + siblingGap),
      h: round(bottom + levelGap),
    },
    acrossExtent,
    alongExtent,
  };
}

