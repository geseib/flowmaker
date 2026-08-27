import { DENSITY, MAX_LABEL_W } from './constants.js';
import { round, estimateTextSize, roundedPath } from './geometry.js';
import { iconFor } from './icons.js';
import { treeLayout, inspectTree } from './tree.js';

export { DENSITY };

const SUBGRAPH_PAD = 26;
// A loop that travels back more than this many ranks is drawn as a pair of
// tagged connectors rather than one long line dragged across the whole
// diagram. Short loops still read better as an actual line.
const WRAP_MIN_SPAN = 3;
const WRAP_TAGS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
const SUBGRAPH_HEADER = 30;

// Depth-first search in node-declaration order. An edge pointing at a node that
// is currently on the DFS stack closes a cycle, so it becomes a back edge.
export function removeCycles(nodes, edges) {
  const forward = [];
  const back = [];
  const adj = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (e.from === e.to) {
      back.push(e);
      continue;
    }
    if (!adj.has(e.from)) adj.set(e.from, []);
    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.from).push(e);
  }

  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const state = new Map([...adj.keys()].map((id) => [id, WHITE]));

  const visit = (id) => {
    state.set(id, GREY);
    for (const e of adj.get(id)) {
      const s = state.get(e.to);
      if (s === GREY) {
        back.push(e);
      } else {
        forward.push(e);
        if (s === WHITE) visit(e.to);
      }
    }
    state.set(id, BLACK);
  };

  for (const n of nodes) if (state.get(n.id) === WHITE) visit(n.id);
  for (const id of adj.keys()) if (state.get(id) === WHITE) visit(id);
  return { forward, back };
}

// Longest-path ranking: rank(n) = 0 for sources, else 1 + max(rank(preds)).
export function assignRanks(nodes, forwardEdges) {
  const preds = new Map(nodes.map((n) => [n.id, []]));
  for (const e of forwardEdges) {
    if (!preds.has(e.to)) preds.set(e.to, []);
    if (!preds.has(e.from)) preds.set(e.from, []);
    preds.get(e.to).push(e.from);
  }

  const ranks = new Map();
  const resolving = new Set();
  const rankOf = (id) => {
    if (ranks.has(id)) return ranks.get(id);
    if (resolving.has(id)) return 0;
    resolving.add(id);
    let r = 0;
    for (const p of preds.get(id) ?? []) r = Math.max(r, rankOf(p) + 1);
    resolving.delete(id);
    ranks.set(id, r);
    return r;
  };

  for (const n of nodes) rankOf(n.id);
  return ranks;
}

// Shapes that need extra room so the label does not spill outside the outline.
const SHAPE_INFLATE = {
  rhombus: { w: 1.35, h: 1.5 },
  hexagon: { w: 1.2, h: 1 },
  circle: { w: 1.25, h: 1.6 },
  doublecircle: { w: 1.3, h: 1.7 },
  parallelogram: { w: 1.2, h: 1 },
  trapezoid: { w: 1.25, h: 1 },
  cylinder: { w: 1, h: 1.2 },
};

// Median heuristic: move each node to the median position of its neighbours in
// the adjacent rank, then re-sort. Four sweeps.
export function orderRanks(nodes, edges, ranks) {
  const byRank = new Map();
  for (const n of nodes) {
    const r = ranks.get(n.id) ?? 0;
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r).push(n.id);
  }
  const rankNums = [...byRank.keys()].sort((a, b) => a - b);
  const pos = new Map();
  for (const r of rankNums) byRank.get(r).forEach((id, i) => pos.set(id, i));

  const preds = new Map(nodes.map((n) => [n.id, []]));
  const succs = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (preds.has(e.to)) preds.get(e.to).push(e.from);
    if (succs.has(e.from)) succs.get(e.from).push(e.to);
  }

  const median = (id, side) => {
    const neighbours = (side === 'pred' ? preds : succs).get(id) ?? [];
    const values = neighbours.map((x) => pos.get(x)).filter((v) => v !== undefined).sort((a, b) => a - b);
    if (values.length === 0) return pos.get(id);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  };

  for (let sweep = 0; sweep < 4; sweep += 1) {
    const forward = sweep % 2 === 0;
    const order = forward ? rankNums : [...rankNums].reverse();
    for (const r of order) {
      const ids = byRank.get(r);
      const keyed = ids.map((id, i) => ({ id, key: median(id, forward ? 'pred' : 'succ'), tie: i }));
      keyed.sort((a, b) => (a.key - b.key) || (a.tie - b.tie));
      byRank.set(r, keyed.map((k) => k.id));
      byRank.get(r).forEach((id, i) => pos.set(id, i));
    }
  }
  return pos;
}

export function layout(graph, opts = {}) {
  // A hierarchy is arranged by its own rules. If the graph is not one, say why
  // and fall back rather than drawing a chart that misrepresents it.
  if (opts.layout === 'tree') {
    const check = inspectTree(graph);
    if (check.ok) return treeLayout(graph, opts);
    opts.onWarning?.({
      code: 'NOT_A_HIERARCHY',
      message: `${check.message} Falling back to the flow layout.`,
    });
  }

  const direction = opts.direction ?? graph.direction ?? 'LR';
  const densityKey = opts.density ?? 'standard';
  const spec = DENSITY[densityKey] ?? DENSITY.standard;
  const measure = opts.measure ?? ((label) => estimateTextSize(label, spec));
  const horizontal = direction === 'LR' || direction === 'RL';

  const nodes = (graph.nodes ?? []).map((n) => ({ ...n }));
  if (nodes.length === 0) {
    return { nodes: [], edges: [], subgraphs: [], bounds: { w: 0, h: 0 }, direction, density: densityKey };
  }

  const { forward, back } = removeCycles(nodes, graph.edges ?? []);
  const backSet = new Set(back.map((e) => `${e.from} ${e.to} ${e.label}`));
  const ranks = assignRanks(nodes, forward);
  const order = orderRanks(nodes, forward, ranks);

  // The icon sits above the label, so the node has to grow to hold both.
  // Reserving it here (rather than in the renderer) is what keeps the label
  // from colliding with the glyph.
  // fontSize * 1.5 is the icon box; the ring around it reaches 1.22x that
  // (see RING_RATIO in render.js), and the rest is breathing room.
  const iconSpace = opts.iconSpace ? spec.fontSize * 1.5 * 1.22 + spec.padY * 0.95 : 0;

  for (const n of nodes) {
    const base = measure(n.label, spec);
    const inflate = SHAPE_INFLATE[n.shape] ?? { w: 1, h: 1 };
    const extra = iconSpace && iconFor(n) ? iconSpace : 0;
    n.w = Math.round(Math.min(MAX_LABEL_W, base.w * inflate.w));
    n.h = Math.round(base.h * inflate.h + extra);
    n.rank = ranks.get(n.id) ?? 0;
    n.order = order.get(n.id) ?? 0;
  }

  const byRank = new Map();
  for (const n of nodes) {
    if (!byRank.has(n.rank)) byRank.set(n.rank, []);
    byRank.get(n.rank).push(n);
  }
  const rankNums = [...byRank.keys()].sort((a, b) => a - b);
  for (const r of rankNums) byRank.get(r).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  const mainSizeOf = (n) => (horizontal ? n.w : n.h);
  const crossSizeOf = (n) => (horizontal ? n.h : n.w);

  const rankMain = new Map();
  const rankMainSize = new Map();
  let cursor = 0;
  for (const r of rankNums) {
    const size = Math.max(...byRank.get(r).map(mainSizeOf));
    rankMain.set(r, cursor);
    rankMainSize.set(r, size);
    cursor += size + spec.rankGap;
  }
  const mainExtent = Math.max(0, cursor - spec.rankGap);

  const rankCross = new Map();
  for (const r of rankNums) {
    const list = byRank.get(r);
    rankCross.set(r, list.reduce((sum, n) => sum + crossSizeOf(n), 0) + spec.laneGap * (list.length - 1));
  }
  const crossExtent = Math.max(...rankCross.values());

  for (const r of rankNums) {
    const list = byRank.get(r);
    let c = (crossExtent - rankCross.get(r)) / 2;
    for (const n of list) {
      const main = rankMain.get(r) + (rankMainSize.get(r) - mainSizeOf(n)) / 2;
      if (horizontal) {
        n.x = main;
        n.y = c;
      } else {
        n.y = main;
        n.x = c;
      }
      c += crossSizeOf(n) + spec.laneGap;
    }
  }

  if (direction === 'RL') for (const n of nodes) n.x = mainExtent - n.x - n.w;
  if (direction === 'BT') for (const n of nodes) n.y = mainExtent - n.y - n.h;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const subgraphs = (graph.subgraphs ?? []).map((sg) => {
    const members = sg.nodeIds.map((id) => nodeById.get(id)).filter(Boolean);
    if (members.length === 0) return { id: sg.id, label: sg.label, x: 0, y: 0, w: 0, h: 0 };
    const x = Math.min(...members.map((n) => n.x)) - SUBGRAPH_PAD;
    const y = Math.min(...members.map((n) => n.y)) - SUBGRAPH_PAD - SUBGRAPH_HEADER;
    return {
      id: sg.id,
      label: sg.label,
      x,
      y,
      w: Math.max(...members.map((n) => n.x + n.w)) + SUBGRAPH_PAD - x,
      h: Math.max(...members.map((n) => n.y + n.h)) + SUBGRAPH_PAD - y,
    };
  });

  // Shift everything positive: subgraph headers can push above the origin.
  const dx = -Math.min(0, ...nodes.map((n) => n.x), ...subgraphs.map((s) => s.x));
  const dy = -Math.min(0, ...nodes.map((n) => n.y), ...subgraphs.map((s) => s.y));
  for (const n of nodes) {
    n.x = round(n.x + dx);
    n.y = round(n.y + dy);
  }
  for (const s of subgraphs) {
    s.x = round(s.x + dx);
    s.y = round(s.y + dy);
  }

  const nodeBottom = Math.max(...nodes.map((n) => n.y + n.h), ...subgraphs.map((s) => s.y + s.h));
  const nodeRight = Math.max(...nodes.map((n) => n.x + n.w), ...subgraphs.map((s) => s.x + s.w));
  const gutter = spec.laneGap + spec.rankGap * 0.35;

  const anchorsOf = (n) => ({
    out: horizontal ? { x: n.x + n.w, y: n.y + n.h / 2 } : { x: n.x + n.w / 2, y: n.y + n.h },
    in: horizontal ? { x: n.x, y: n.y + n.h / 2 } : { x: n.x + n.w / 2, y: n.y },
    outRev: horizontal ? { x: n.x, y: n.y + n.h / 2 } : { x: n.x + n.w / 2, y: n.y },
    inRev: horizontal ? { x: n.x + n.w, y: n.y + n.h / 2 } : { x: n.x + n.w / 2, y: n.y + n.h },
    bottom: { x: n.x + n.w / 2, y: n.y + n.h },
  });
  const reversed = direction === 'RL' || direction === 'BT';

  const loops = opts.loops ?? 'auto';
  const wrapsLoop = (span) => (loops === 'wrap' ? true : loops === 'line' ? false : span >= WRAP_MIN_SPAN);

  let backIndex = 0;
  let wrapIndex = 0;
  const tagRadius = spec.fontSize * 0.78;
  // Tags hang just under their own node rather than down in the gutter with the
  // loop lines. Parked at the bottom of the canvas they fall outside the view at
  // 1:1 on a short panel, which makes the whole connector easy to miss.
  const tagDrop = tagRadius * 2.2;

  const edges = (graph.edges ?? []).map((e) => {
    const from = nodeById.get(e.from);
    const to = nodeById.get(e.to);
    const isBackEdge = backSet.has(`${e.from} ${e.to} ${e.label}`);
    if (!from || !to) return { ...e, isBackEdge, path: '', labelPos: { x: 0, y: 0 } };

    const a = anchorsOf(from);
    const b = anchorsOf(to);
    let points;

    if (e.from === e.to) {
      const drop = from.h * 0.75;
      points = [
        { x: from.x + from.w * 0.3, y: from.y + from.h },
        { x: from.x + from.w * 0.3, y: from.y + from.h + drop },
        { x: from.x + from.w * 0.7, y: from.y + from.h + drop },
        { x: from.x + from.w * 0.7, y: from.y + from.h },
      ];
    } else if (isBackEdge && wrapsLoop(Math.abs((from.rank ?? 0) - (to.rank ?? 0)))) {
      // A long loop: drop a tagged connector below the source and a matching one
      // below the target, the way an off-page connector works on a flowchart.
      // Both carry the same letter, so the eye jumps instead of tracking a line
      // back across everything in between.
      const tag = WRAP_TAGS[wrapIndex % WRAP_TAGS.length];
      wrapIndex += 1;
      const out = { x: a.bottom.x, y: from.y + from.h + tagDrop };
      const into = { x: b.bottom.x, y: to.y + to.h + tagDrop };
      return {
        ...e,
        isBackEdge: true,
        isWrap: true,
        tag,
        path: `M ${round(a.bottom.x)} ${round(a.bottom.y)} L ${round(out.x)} ${round(out.y - tagRadius)}`
          + ` M ${round(into.x)} ${round(into.y - tagRadius)} L ${round(b.bottom.x)} ${round(b.bottom.y)}`,
        wrapTags: [
          { ...out, tag, role: 'out' },
          { ...into, tag, role: 'in' },
        ],
        tagRadius: round(tagRadius),
        labelPos: { x: round(out.x), y: round(out.y + tagRadius * 1.9) },
      };
    } else if (isBackEdge) {
      // A short loop still reads best as a real line: dip into the reserved
      // gutter, travel against the flow, and rise into the target.
      const lane = nodeBottom + gutter * 0.5 + backIndex * (spec.laneGap * 0.8);
      backIndex += 1;
      points = [a.bottom, { x: a.bottom.x, y: lane }, { x: b.bottom.x, y: lane }, b.bottom];
    } else {
      const start = reversed ? a.outRev : a.out;
      const end = reversed ? b.inRev : b.in;
      const mid = horizontal ? (start.x + end.x) / 2 : (start.y + end.y) / 2;
      points = horizontal
        ? [start, { x: mid, y: start.y }, { x: mid, y: end.y }, end]
        : [start, { x: start.x, y: mid }, { x: end.x, y: mid }, end];
    }

    const half = Math.floor(points.length / 2);
    const midPoint = points[half];
    const prevPoint = points[half - 1] ?? midPoint;
    return {
      ...e,
      isBackEdge,
      isWrap: false,
      path: roundedPath(points, Math.min(spec.corner * 1.5, 26)),
      labelPos: { x: round((midPoint.x + prevPoint.x) / 2), y: round((midPoint.y + prevPoint.y) / 2) },
    };
  });

  const backDepth = backIndex > 0 ? gutter * 0.5 + backIndex * (spec.laneGap * 0.8) + spec.laneGap : 0;
  const wrapDepth = wrapIndex > 0 ? tagRadius * 2.6 + spec.laneGap * 0.5 : 0;
  const selfDepth = edges.some((e) => e.from === e.to) ? spec.nodeH : 0;

  return {
    nodes,
    edges,
    subgraphs,
    direction,
    density: densityKey,
    bounds: {
      w: round(nodeRight + spec.laneGap),
      h: round(nodeBottom + Math.max(backDepth, wrapDepth, selfDepth) + spec.laneGap),
    },
  };
}
