(function(){
/* src/constants.js */
const STYLE_KEYS = [
  'neon-circuit', 'executive-clean', 'blueprint', 'soft-depth', 'bold-brutal', 'infographic',
];
const DENSITY_KEYS = ['marquee', 'standard', 'compact'];
const DIRECTION_KEYS = ['LR', 'RL', 'TD', 'BT'];
const DEFAULTS = {
  style: 'executive-clean',
  palette: 'harbor',
  direction: 'LR',
  density: 'standard',
};

// Hard cap on node width. Beyond this a label wraps instead of stretching.
const MAX_LABEL_W = 460;
const DENSITY = {
  marquee:  { fontSize: 30, labelFontSize: 22, padX: 40, padY: 28, rankGap: 190, laneGap: 76, stroke: 5, minNodeW: 260, nodeH: 104, corner: 18 },
  standard: { fontSize: 18, labelFontSize: 13, padX: 24, padY: 16, rankGap: 120, laneGap: 46, stroke: 2.5, minNodeW: 170, nodeH: 66, corner: 12 },
  compact:  { fontSize: 13, labelFontSize: 10, padX: 14, padY: 10, rankGap: 82, laneGap: 30, stroke: 1.5, minNodeW: 120, nodeH: 46, corner: 8 },
};

/* src/icons.js */
// Every icon is inline SVG geometry on a 24x24 grid, stroke-based so it inherits
// currentColor and the style's stroke weight. No emoji, no icon font, no raster,
// no network. Each one is a handful of primitives: these are read from across a
// room, not inspected up close.
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  document: `<path ${S} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline ${S} points="14 3 14 8 19 8"/><line ${S} x1="9" y1="13" x2="15" y2="13"/><line ${S} x1="9" y1="17" x2="13" y2="17"/>`,
  table: `<rect ${S} x="3" y="4" width="18" height="16" rx="2"/><line ${S} x1="3" y1="9" x2="21" y2="9"/><line ${S} x1="3" y1="14" x2="21" y2="14"/><line ${S} x1="10" y1="9" x2="10" y2="20"/>`,
  decision: `<path ${S} d="M12 2.5 21.5 12 12 21.5 2.5 12z"/><line ${S} x1="12" y1="8.5" x2="12" y2="13"/><circle cx="12" cy="16.2" r="1.1" fill="currentColor"/>`,
  person: `<circle ${S} cx="12" cy="8" r="3.6"/><path ${S} d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>`,
  agent: `<rect ${S} x="4" y="7" width="16" height="12" rx="3"/><line ${S} x1="12" y1="3" x2="12" y2="7"/><circle cx="9" cy="13" r="1.4" fill="currentColor"/><circle cx="15" cy="13" r="1.4" fill="currentColor"/><line ${S} x1="1.8" y1="12" x2="4" y2="12"/><line ${S} x1="20" y1="12" x2="22.2" y2="12"/>`,
  money: `<circle ${S} cx="12" cy="12" r="9"/><path ${S} d="M14.8 9.2a3 3 0 0 0-2.8-1.7c-1.6 0-2.8.9-2.8 2.1 0 2.9 5.9 1.4 5.9 4.4 0 1.3-1.3 2.3-3.1 2.3a3.2 3.2 0 0 1-3-1.8"/><line ${S} x1="12" y1="5.4" x2="12" y2="18.6"/>`,
  folder: `<path ${S} d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2l2 2.5h8.8A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>`,
  database: `<ellipse ${S} cx="12" cy="6" rx="7.5" ry="3"/><path ${S} d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path ${S} d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>`,
  clock: `<circle ${S} cx="12" cy="12" r="9"/><polyline ${S} points="12 6.8 12 12 15.6 14"/>`,
  check: `<circle ${S} cx="12" cy="12" r="9"/><polyline ${S} points="7.8 12.4 10.8 15.4 16.4 9"/>`,
  alert: `<path ${S} d="M12 3.4 22 20.6H2z"/><line ${S} x1="12" y1="9.6" x2="12" y2="14"/><circle cx="12" cy="17.2" r="1.1" fill="currentColor"/>`,
  gear: `<circle ${S} cx="12" cy="12" r="3.4"/><path ${S} d="M12 2.6v2.2M12 19.2v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.4 19.6 6 18M18 6l1.6-1.6"/>`,
  mail: `<rect ${S} x="2.5" y="5" width="19" height="14" rx="2"/><polyline ${S} points="3.4 6.6 12 13 20.6 6.6"/>`,
  search: `<circle ${S} cx="10.6" cy="10.6" r="6.6"/><line ${S} x1="15.4" y1="15.4" x2="21" y2="21"/>`,
  start: `<circle ${S} cx="12" cy="12" r="9"/><polygon points="10 8.4 16.4 12 10 15.6" fill="currentColor"/>`,
  end: `<circle ${S} cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/>`,
  shield: `<path ${S} d="M12 2.8 20 6v6c0 4.6-3.3 8.2-8 9.2-4.7-1-8-4.6-8-9.2V6z"/><polyline ${S} points="8.8 12 11.2 14.4 15.4 10"/>`,
  box: `<path ${S} d="M21 8.2 12 3 3 8.2v7.6L12 21l9-5.2z"/><polyline ${S} points="3 8.2 12 13.4 21 8.2"/><line ${S} x1="12" y1="13.4" x2="12" y2="21"/>`,
  truck: `<path ${S} d="M2.5 6.5h11v9h-11z"/><path ${S} d="M13.5 10h4l4 3.4v2.1h-8z"/><circle ${S} cx="6.6" cy="18" r="1.9"/><circle ${S} cx="17.4" cy="18" r="1.9"/>`,
  chart: `<line ${S} x1="4" y1="20" x2="20" y2="20"/><rect x="6" y="12" width="3.2" height="6" fill="currentColor"/><rect x="10.4" y="8" width="3.2" height="10" fill="currentColor"/><rect x="14.8" y="4.5" width="3.2" height="13.5" fill="currentColor"/>`,
  code: `<polyline ${S} points="8.4 8 4 12 8.4 16"/><polyline ${S} points="15.6 8 20 12 15.6 16"/><line ${S} x1="13.4" y1="5.6" x2="10.6" y2="18.4"/>`,
  lock: `<rect ${S} x="4.6" y="10.4" width="14.8" height="10" rx="2"/><path ${S} d="M8.4 10.4V7.6a3.6 3.6 0 0 1 7.2 0v2.8"/>`,
};
const ICON_NAMES = Object.keys(ICONS);

// Only the Infographic style shows icons. Layout reserves vertical space and
// the renderer emits the slot based on this, so the two never disagree.
function showIconsFor(styleKey) {
  return styleKey === 'infographic';
}

// Ordered: the first matching entry wins, so the more specific words come first.
// Every term matches on a whole-word boundary, which is why "repayment" does not
// resolve to money.
const KEYWORDS = [
  ['money', ['payment', 'pay', 'invoice', 'billing', 'bill', 'charge', 'refund', 'capture', 'price', 'pricing', 'cost', 'budget', 'revenue', 'payout', 'fee', 'salary', 'compensation', 'offer']],
  ['agent', ['agent', 'automated', 'automation', 'bot', 'model', 'ai', 'ml', 'scoring', 'classifier', 'inference']],
  ['person', ['manager', 'recruiter', 'candidate', 'customer', 'applicant', 'reviewer', 'interviewer', 'interview', 'engineer', 'analyst', 'staff', 'team', 'human', 'debrief', 'committee', 'panel', 'stakeholder', 'owner']],
  ['table', ['table', 'spreadsheet', 'roster', 'matrix', 'scorecard', 'inventory']],
  ['database', ['database', 'db', 'warehouse', 'ledger', 'store', 'persist', 'record', 'index']],
  ['document', ['document', 'doc', 'contract', 'report', 'form', 'application', 'applications', 'resume', 'policy', 'spec', 'brief', 'statement', 'receipt', 'manifest', 'postmortem']],
  ['folder', ['folder', 'archive', 'case', 'file', 'files', 'repository', 'bundle', 'collection']],
  ['mail', ['email', 'mail', 'notify', 'notification', 'message', 'communicate', 'announce', 'inform']],
  ['clock', ['wait', 'delay', 'hold', 'sla', 'timeout', 'schedule', 'queue', 'pending', 'hours', 'days']],
  ['check', ['verify', 'validate', 'confirm', 'approve', 'approved', 'complete', 'accept', 'accepted', 'pass', 'signoff']],
  ['alert', ['alert', 'incident', 'escalate', 'escalation', 'page', 'severity', 'failure', 'fail', 'error', 'reject', 'rejected', 'decline', 'declined', 'rollback', 'breach']],
  ['search', ['screen', 'search', 'investigate', 'triage', 'detect', 'detection', 'audit', 'inspect', 'diagnose', 'scan']],
  ['shield', ['security', 'compliance', 'kyc', 'sanctions', 'risk', 'fraud', 'governance', 'privacy']],
  ['lock', ['authorize', 'authorized', 'authorization', 'authenticate', 'credential', 'permission', 'access', 'identity', 'verification']],
  ['truck', ['ship', 'shipment', 'carrier', 'deliver', 'delivery', 'delivered', 'dispatch', 'fulfil', 'fulfill', 'fulfillment']],
  ['box', ['pack', 'picking', 'pick', 'parcel', 'stock', 'reserve', 'provision', 'package', 'backorder']],
  ['chart', ['metrics', 'analytics', 'dashboard', 'measure', 'monitor', 'monitoring', 'forecast', 'score']],
  ['code', ['build', 'deploy', 'release', 'commit', 'merge', 'develop', 'implement', 'code', 'test', 'ci', 'pipeline']],
  ['gear', ['configure', 'configuration', 'setup', 'process', 'run', 'execute', 'operate', 'maintain', 'tune']],
];

// A shape is a weak signal, used only when nothing stronger matched.
const SHAPE_FALLBACK = {
  rhombus: 'decision',
  hexagon: 'decision',
  cylinder: 'database',
  stadium: 'start',
  circle: 'start',
  doublecircle: 'end',
  subroutine: 'gear',
  parallelogram: 'document',
  trapezoid: 'document',
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function iconFor(node) {
  if (!node) return null;

  // 1. An explicit author choice: A:::icon-money
  for (const cls of node.classes ?? []) {
    if (cls.startsWith('icon-')) {
      const name = cls.slice(5);
      if (name in ICONS) return name;
    }
  }

  // 2. A whole-word keyword match on the label.
  const label = String(node.label ?? '').toLowerCase();
  for (const [name, terms] of KEYWORDS) {
    for (const term of terms) {
      if (new RegExp(`(^|[^a-z0-9])${escapeRe(term)}([^a-z0-9]|$)`).test(label)) return name;
    }
  }

  // 3. The shape, as a last resort.
  return SHAPE_FALLBACK[node.shape] ?? null;
}

/* src/layout.js */

const SUBGRAPH_PAD = 26;
const SUBGRAPH_HEADER = 30;

const round = (n) => Math.round(n * 100) / 100;

// Depth-first search in node-declaration order. An edge pointing at a node that
// is currently on the DFS stack closes a cycle, so it becomes a back edge.
function removeCycles(nodes, edges) {
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
function assignRanks(nodes, forwardEdges) {
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

// Headless text measurement. Deliberately crude and deterministic: the renderer
// re-measures with the real font in the browser and re-runs layout.
function estimateTextSize(label, { fontSize, padX, padY, minNodeW, nodeH }) {
  const charW = fontSize * 0.58;
  const maxTextW = MAX_LABEL_W - padX * 2;
  const oneLineW = String(label).length * charW;
  const lines = Math.max(1, Math.ceil(oneLineW / maxTextW));
  return {
    w: Math.round(Math.min(MAX_LABEL_W, Math.max(minNodeW, oneLineW + padX * 2))),
    h: Math.round(Math.max(nodeH, lines * fontSize * 1.35 + padY * 2)),
  };
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
function orderRanks(nodes, edges, ranks) {
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

function roundedPath(points, radius) {
  if (points.length < 2) return '';
  let d = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y) || 1;
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y) || 1;
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const a = { x: cur.x - ((cur.x - prev.x) / inLen) * r, y: cur.y - ((cur.y - prev.y) / inLen) * r };
    const b = { x: cur.x + ((next.x - cur.x) / outLen) * r, y: cur.y + ((next.y - cur.y) / outLen) * r };
    d += ` L ${round(a.x)} ${round(a.y)} Q ${round(cur.x)} ${round(cur.y)} ${round(b.x)} ${round(b.y)}`;
  }
  const last = points.at(-1);
  d += ` L ${round(last.x)} ${round(last.y)}`;
  return d;
}
function layout(graph, opts = {}) {
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
  const iconSpace = opts.iconSpace ? spec.fontSize * 1.5 + spec.padY * 0.95 : 0;

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

  let backIndex = 0;
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
    } else if (isBackEdge) {
      // Dip into the reserved gutter beneath every node, travel against the
      // flow, and rise into the target. Each back edge gets its own lane.
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
      path: roundedPath(points, Math.min(spec.corner * 1.5, 26)),
      labelPos: { x: round((midPoint.x + prevPoint.x) / 2), y: round((midPoint.y + prevPoint.y) / 2) },
    };
  });

  const backDepth = backIndex > 0 ? gutter * 0.5 + backIndex * (spec.laneGap * 0.8) + spec.laneGap : 0;
  const selfDepth = edges.some((e) => e.from === e.to) ? spec.nodeH : 0;

  return {
    nodes,
    edges,
    subgraphs,
    direction,
    density: densityKey,
    bounds: {
      w: round(nodeRight + spec.laneGap),
      h: round(nodeBottom + Math.max(backDepth, selfDepth) + spec.laneGap),
    },
  };
}

/* src/styles/neon-circuit.js */
const __default_src_styles_neon_circuit_js = {
  key: 'neon-circuit',
  name: 'Neon Circuit',
  dark: true,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: "SF Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --stroke: ${spec.stroke}px;
  --corner: ${spec.corner}px;
  background:
    radial-gradient(ellipse 80% 60% at 50% 40%, color-mix(in oklab, var(--c1) 14%, transparent), transparent 70%),
    var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: color-mix(in oklab, var(--c1) 6%, transparent); stroke: color-mix(in oklab, var(--c1) 45%, transparent); stroke-width: var(--stroke); rx: calc(var(--corner) + 8px); }
.fm-subgraph text { fill: var(--c1); font-size: ${spec.labelFontSize + 3}px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
.fm-node-shape {
  fill: color-mix(in oklab, var(--c1) 12%, var(--surface));
  stroke: var(--c1); stroke-width: var(--stroke);
  filter: drop-shadow(0 0 calc(var(--stroke) * 2.4) color-mix(in oklab, var(--c1) 70%, transparent));
  transition: filter .2s ease, stroke-width .2s ease;
}
.fm-node[data-kind="decision"] .fm-node-shape { stroke: var(--c2); fill: color-mix(in oklab, var(--c2) 12%, var(--surface)); filter: drop-shadow(0 0 calc(var(--stroke) * 2.4) color-mix(in oklab, var(--c2) 70%, transparent)); }
.fm-node[data-kind="terminal"] .fm-node-shape { stroke: var(--c3); fill: color-mix(in oklab, var(--c3) 14%, var(--surface)); filter: drop-shadow(0 0 calc(var(--stroke) * 2.8) color-mix(in oklab, var(--c3) 80%, transparent)); }
.fm-node-rule { stroke: var(--c1); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--ink); font-size: ${spec.fontSize}px; font-weight: 700; letter-spacing: .02em; }
.fm-node-icon { display: none; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { stroke-width: calc(var(--stroke) * 1.7); filter: drop-shadow(0 0 calc(var(--stroke) * 5) var(--c1)); }
.fm-node:focus-visible { outline: none; }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { stroke: var(--c3); stroke-width: calc(var(--stroke) * 2); filter: drop-shadow(0 0 calc(var(--stroke) * 7) var(--c3)); }
.fm-edge { fill: none; stroke: var(--c1); stroke-width: var(--stroke); stroke-linecap: round; filter: drop-shadow(0 0 calc(var(--stroke) * 1.4) currentColor); }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 1 12; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 2); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 14 10; }
.fm-edge-label { fill: var(--ink); font-size: ${spec.labelFontSize}px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.fm-edge-label-bg { fill: var(--ground); }
.fm-arrow { fill: var(--c1); }
.fm-arrow-alert { fill: var(--c4); }
`.trim(),
};

/* src/styles/executive-clean.js */
const __default_src_styles_executive_clean_js = {
  key: 'executive-clean',
  name: 'Executive Clean',
  dark: false,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --stroke: ${spec.stroke}px;
  --corner: ${spec.corner}px;
  background: var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: var(--surface-2); stroke: var(--border); stroke-width: var(--stroke); rx: calc(var(--corner) + 6px); }
.fm-subgraph text { fill: var(--ink-dim); font-size: ${spec.labelFontSize + 3}px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.fm-node-shape { fill: var(--surface); stroke: var(--c1); stroke-width: var(--stroke); transition: filter .18s ease, stroke-width .18s ease; }
.fm-node[data-kind="decision"] .fm-node-shape { stroke: var(--c2); fill: var(--c2-soft); }
.fm-node[data-kind="terminal"] .fm-node-shape { stroke: var(--c3); fill: var(--c3-soft); }
.fm-node-rule { stroke: var(--c1); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--ink); font-size: ${spec.fontSize}px; font-weight: 650; }
.fm-node-icon { display: none; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { filter: drop-shadow(0 4px 14px rgb(0 0 0 / .18)); stroke-width: calc(var(--stroke) * 1.6); }
.fm-node:focus-visible { outline: none; }
.fm-node:focus-visible .fm-node-shape { stroke: var(--c2); }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { stroke: var(--c3); stroke-width: calc(var(--stroke) * 2); filter: drop-shadow(0 0 18px var(--c3)); }
.fm-edge { fill: none; stroke: var(--c1); stroke-width: var(--stroke); stroke-linecap: round; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 2 10; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 1.9); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 12 9; }
.fm-edge-label { fill: var(--ink-dim); font-size: ${spec.labelFontSize}px; font-weight: 700; }
.fm-edge-label-bg { fill: var(--ground); }
.fm-arrow { fill: var(--c1); }
.fm-arrow-alert { fill: var(--c4); }
`.trim(),
};

/* src/styles/blueprint.js */
const __default_src_styles_blueprint_js = {
  key: 'blueprint',
  name: 'Blueprint',
  dark: true,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --stroke: ${Math.max(1, spec.stroke * 0.7)}px;
  --corner: 2px;
  background:
    repeating-linear-gradient(0deg, color-mix(in oklab, var(--c1) 16%, transparent) 0 1px, transparent 1px ${Math.round(spec.laneGap / 2)}px),
    repeating-linear-gradient(90deg, color-mix(in oklab, var(--c1) 16%, transparent) 0 1px, transparent 1px ${Math.round(spec.laneGap / 2)}px),
    var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: none; stroke: color-mix(in oklab, var(--c1) 55%, transparent); stroke-width: var(--stroke); stroke-dasharray: 6 5; rx: 2px; }
.fm-subgraph text { fill: var(--c1); font-size: ${spec.labelFontSize + 2}px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
.fm-node-shape { fill: color-mix(in oklab, var(--ground) 82%, transparent); stroke: var(--c1); stroke-width: var(--stroke); transition: stroke-width .16s ease; }
.fm-node[data-kind="decision"] .fm-node-shape { stroke: var(--c2); }
.fm-node[data-kind="terminal"] .fm-node-shape { stroke: var(--c3); }
.fm-node-rule { stroke: var(--c1); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--ink); font-size: ${Math.round(spec.fontSize * 0.92)}px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; }
.fm-node-icon { display: none; }
.fm-node[data-has-detail="true"] { cursor: crosshair; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { stroke-width: calc(var(--stroke) * 2.4); }
.fm-node:focus-visible { outline: none; }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { stroke: var(--c3); stroke-width: calc(var(--stroke) * 3); }
.fm-edge { fill: none; stroke: var(--c1); stroke-width: var(--stroke); stroke-linecap: square; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 3 4; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 2.4); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 10 3 2 3; }
.fm-edge-label { fill: var(--c1); font-size: ${spec.labelFontSize}px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; }
.fm-edge-label-bg { fill: var(--ground); }
.fm-arrow { fill: var(--c1); }
.fm-arrow-alert { fill: var(--c4); }
`.trim(),
};

/* src/styles/soft-depth.js */
const __default_src_styles_soft_depth_js = {
  key: 'soft-depth',
  name: 'Soft Depth',
  dark: false,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --stroke: ${spec.stroke}px;
  --corner: ${Math.round(spec.corner * 1.9)}px;
  background: linear-gradient(165deg, var(--surface-2), var(--ground));
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: var(--surface-2); stroke: none; rx: calc(var(--corner) + 10px); filter: drop-shadow(0 10px 26px rgb(0 0 0 / .07)); }
.fm-subgraph text { fill: var(--ink-dim); font-size: ${spec.labelFontSize + 3}px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.fm-node-shape {
  fill: var(--surface); stroke: none;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / .12)) drop-shadow(0 12px 28px rgb(0 0 0 / .12));
  transition: filter .22s ease;
}
.fm-node[data-kind="decision"] .fm-node-shape { fill: var(--c2-soft); }
.fm-node[data-kind="terminal"] .fm-node-shape { fill: var(--c3-soft); }
.fm-node-rule { stroke: var(--border); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--ink); font-size: ${spec.fontSize}px; font-weight: 600; letter-spacing: -.005em; }
.fm-node-icon { display: none; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { filter: drop-shadow(0 2px 4px rgb(0 0 0 / .14)) drop-shadow(0 20px 44px rgb(0 0 0 / .2)); }
.fm-node:focus-visible { outline: none; }
.fm-node:focus-visible .fm-node-shape { stroke: var(--c2); stroke-width: var(--stroke); }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { fill: var(--c3-soft); filter: drop-shadow(0 2px 6px rgb(0 0 0 / .16)) drop-shadow(0 0 30px color-mix(in oklab, var(--c3) 55%, transparent)); }
.fm-edge { fill: none; stroke: var(--c1); stroke-width: var(--stroke); stroke-linecap: round; opacity: .72; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 2 9; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 1.8); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 10 8; opacity: .85; }
.fm-edge-label { fill: var(--ink-dim); font-size: ${spec.labelFontSize}px; font-weight: 650; }
.fm-edge-label-bg { fill: var(--surface); }
.fm-arrow { fill: var(--c1); }
.fm-arrow-alert { fill: var(--c4); }
`.trim(),
};

/* src/styles/bold-brutal.js */
const __default_src_styles_bold_brutal_js = {
  key: 'bold-brutal',
  name: 'Bold Brutal',
  dark: false,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: "Helvetica Neue", Helvetica, Arial, -apple-system, BlinkMacSystemFont, sans-serif;
  --stroke: ${spec.stroke * 1.4}px;
  --corner: 0px;
  background: var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: none; stroke: var(--ink); stroke-width: var(--stroke); rx: 0; }
.fm-subgraph text { fill: var(--ink); font-size: ${spec.labelFontSize + 4}px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
.fm-node-shape { fill: var(--c1); stroke: var(--ink); stroke-width: var(--stroke); rx: 0; transition: transform .12s ease; }
.fm-node[data-kind="decision"] .fm-node-shape { fill: var(--c2); }
.fm-node[data-kind="terminal"] .fm-node-shape { fill: var(--c3); }
.fm-node-rule { stroke: var(--c1-ink); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--c1-ink); font-size: ${spec.fontSize}px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.fm-node[data-kind="decision"] .fm-node-label { fill: var(--c2-ink); }
.fm-node[data-kind="terminal"] .fm-node-label { fill: var(--c3-ink); }
.fm-node-icon { display: none; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { filter: drop-shadow(${Math.round(spec.stroke * 2)}px ${Math.round(spec.stroke * 2)}px 0 var(--ink)); }
.fm-node:focus-visible { outline: none; }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { fill: var(--c3); filter: drop-shadow(${Math.round(spec.stroke * 3)}px ${Math.round(spec.stroke * 3)}px 0 var(--ink)); }
.fm-node[data-active="true"] .fm-node-label { fill: var(--c3-ink); }
.fm-edge { fill: none; stroke: var(--ink); stroke-width: calc(var(--stroke) * 1.2); stroke-linecap: butt; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 4 8; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 2.2); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-dasharray: 16 8; }
.fm-edge-label { fill: var(--ink); font-size: ${spec.labelFontSize + 2}px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.fm-edge-label-bg { fill: var(--ground); }
.fm-arrow { fill: var(--ink); }
.fm-arrow-alert { fill: var(--c4); }
`.trim(),
};

/* src/styles/infographic.js */
const __default_src_styles_infographic_js = {
  key: 'infographic',
  name: 'Infographic',
  dark: false,
  css: (t, spec) => `
.fm-root {
  ${Object.entries(t).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --stroke: ${spec.stroke}px;
  --corner: ${spec.corner}px;
  background: var(--ground);
  font-family: var(--font);
  color: var(--ink);
}
.fm-svg { display: block; }
.fm-subgraph rect { fill: var(--surface-2); stroke: none; rx: calc(var(--corner) + 8px); }
.fm-subgraph text { fill: var(--ink-dim); font-size: ${spec.labelFontSize + 3}px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.fm-node-shape { fill: var(--c1); stroke: none; transition: filter .16s ease; }
.fm-node[data-kind="decision"] .fm-node-shape { fill: var(--c2); }
.fm-node[data-kind="terminal"] .fm-node-shape { fill: var(--c3); }
.fm-node-rule { stroke: var(--c1-ink); stroke-width: var(--stroke); }
.fm-node-label { fill: var(--c1-ink); font-size: ${spec.fontSize}px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.fm-node[data-kind="decision"] .fm-node-label { fill: var(--c2-ink); }
.fm-node[data-kind="terminal"] .fm-node-label { fill: var(--c3-ink); }
.fm-node-icon { display: block; color: var(--c1-ink); }
.fm-node[data-kind="decision"] .fm-node-icon { color: var(--c2-ink); }
.fm-node[data-kind="terminal"] .fm-node-icon { color: var(--c3-ink); }
.fm-node-icon [stroke] { stroke-width: ${Math.max(1.6, spec.stroke * 0.8)}; }
.fm-node[data-has-detail="true"] { cursor: pointer; }
.fm-node:hover .fm-node-shape, .fm-node:focus-visible .fm-node-shape { filter: drop-shadow(${Math.round(spec.stroke * 1.6)}px ${Math.round(spec.stroke * 1.6)}px 0 var(--border)); }
.fm-node:focus-visible { outline: none; }
.fm-node[data-dimmed="true"] { opacity: .55; }
.fm-node[data-active="true"] .fm-node-shape { fill: var(--c3); filter: drop-shadow(0 0 0 transparent) drop-shadow(${Math.round(spec.stroke * 2.4)}px ${Math.round(spec.stroke * 2.4)}px 0 var(--ink-dim)); }
.fm-node[data-active="true"] .fm-node-label, .fm-node[data-active="true"] .fm-node-icon { color: var(--c3-ink); fill: var(--c3-ink); }
.fm-edge { fill: none; stroke: var(--c1); stroke-width: calc(var(--stroke) * 1.2); stroke-linecap: round; }
.fm-edge[data-kind="dotted"] { stroke-dasharray: 2 10; }
.fm-edge[data-kind="thick"] { stroke-width: calc(var(--stroke) * 2); }
.fm-edge[data-back="true"] { stroke: var(--c4); stroke-width: var(--stroke); }
.fm-edge-label { fill: var(--ink); font-size: ${spec.labelFontSize}px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.fm-edge-label-bg { fill: var(--surface); rx: 999px; }
.fm-arrow { fill: var(--c1); }
.fm-arrow-alert { fill: var(--c4); }
`.trim(),
};

/* src/styles/index.js */






// Order must match STYLE_KEYS in src/constants.js.
const STYLES = [__default_src_styles_neon_circuit_js, __default_src_styles_executive_clean_js, __default_src_styles_blueprint_js, __default_src_styles_soft_depth_js, __default_src_styles_bold_brutal_js, __default_src_styles_infographic_js];
function getStyle(key) {
  return STYLES.find((s) => s.key === key)
    ?? STYLES.find((s) => s.key === 'executive-clean')
    ?? STYLES[0];
}

/* src/palettes.js */
// The four-swatch contract:
//   c1 Flow | c2 Decision | c3 Accent | c4 Alert
const PALETTES = [
  { key: 'harbor', name: 'Harbor', c1: '#2563eb', c2: '#7c3aed', c3: '#0d9488', c4: '#dc2626' },
  { key: 'ember', name: 'Ember', c1: '#ea580c', c2: '#ca8a04', c3: '#0d9488', c4: '#be123c' },
  { key: 'forest', name: 'Forest', c1: '#15803d', c2: '#a16207', c3: '#0891b2', c4: '#b91c1c' },
  { key: 'midnight', name: 'Midnight', c1: '#4f46e5', c2: '#9333ea', c3: '#0891b2', c4: '#e11d48' },
  { key: 'slate', name: 'Slate', c1: '#475569', c2: '#0f766e', c3: '#2563eb', c4: '#c2410c' },
  { key: 'candy', name: 'Candy', c1: '#db2777', c2: '#7c3aed', c3: '#0891b2', c4: '#d97706' },
  { key: 'mono', name: 'Monochrome', c1: '#374151', c2: '#6b7280', c3: '#111827', c4: '#9ca3af' },
  { key: 'signal', name: 'Signal', c1: '#0369a1', c2: '#a16207', c3: '#15803d', c4: '#dc2626' },
];
function getPalette(key) {
  return PALETTES.find((p) => p.key === key) ?? PALETTES[0];
}

const clamp01 = (n) => Math.min(1, Math.max(0, n));

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`;
}

const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

// sRGB <-> Oklab, per Bjorn Ottosson's reference conversion.
function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180) / Math.PI };
}
function oklchToHex({ l, c, h }) {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ].map((v) => linearToSrgb(clamp01(v)));
  return rgbToHex(rgb);
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Picks whichever of near-white or near-black has the higher contrast on the
// given swatch. Every palette swatch is chosen so the winner clears 4.5:1.
function inkFor(hex) {
  const light = '#ffffff';
  const dark = '#0b0f14';
  return contrastRatio(light, hex) >= contrastRatio(dark, hex) ? light : dark;
}

// Shifts a swatch toward the ground so it can serve as a fill behind ink.
function soften(hex, dark) {
  const { l, c, h } = hexToOklch(hex);
  return oklchToHex(dark
    ? { l: Math.max(0.18, l * 0.34), c: c * 0.55, h }
    : { l: Math.min(0.97, 0.93 + l * 0.05), c: Math.min(c * 0.34, 0.06), h });
}
function deriveTokens(palette, { dark = false } = {}) {
  const p = palette;
  const anchor = hexToOklch(p.c1);

  // Surfaces borrow the primary hue at very low chroma so the whole diagram
  // reads as one temperature rather than colored shapes on neutral grey.
  const surface = dark
    ? oklchToHex({ l: 0.19, c: Math.min(anchor.c * 0.12, 0.02), h: anchor.h })
    : oklchToHex({ l: 0.99, c: Math.min(anchor.c * 0.06, 0.006), h: anchor.h });
  const surface2 = dark
    ? oklchToHex({ l: 0.26, c: Math.min(anchor.c * 0.14, 0.025), h: anchor.h })
    : oklchToHex({ l: 0.965, c: Math.min(anchor.c * 0.09, 0.012), h: anchor.h });
  const ground = dark
    ? oklchToHex({ l: 0.13, c: Math.min(anchor.c * 0.1, 0.02), h: anchor.h })
    : oklchToHex({ l: 0.975, c: Math.min(anchor.c * 0.05, 0.008), h: anchor.h });

  // Ink is pushed until it clears 7:1 against the surface (the marquee floor).
  let ink = dark ? '#f5f8fc' : '#0a0e14';
  for (let i = 0; i < 24 && contrastRatio(ink, surface) < 7.2; i += 1) {
    const t = hexToOklch(ink);
    ink = oklchToHex({ l: clamp01(dark ? t.l + 0.02 : t.l - 0.02), c: t.c, h: t.h });
  }
  const inkTone = hexToOklch(ink);
  const inkDim = oklchToHex({ l: clamp01(dark ? inkTone.l - 0.22 : inkTone.l + 0.3), c: inkTone.c, h: inkTone.h });
  const border = dark
    ? oklchToHex({ l: 0.38, c: Math.min(anchor.c * 0.2, 0.03), h: anchor.h })
    : oklchToHex({ l: 0.87, c: Math.min(anchor.c * 0.15, 0.02), h: anchor.h });

  const tokens = {
    '--surface': surface,
    '--surface-2': surface2,
    '--ground': ground,
    '--ink': ink,
    '--ink-dim': inkDim,
    '--border': border,
  };
  for (const k of ['c1', 'c2', 'c3', 'c4']) {
    tokens[`--${k}`] = p[k];
    tokens[`--${k}-soft`] = soften(p[k], dark);
    tokens[`--${k}-ink`] = inkFor(p[k]);
  }
  return tokens;
}

/* src/escape.js */
// Shared by the renderer, the markdown converter, and the export serializer.
// It lives in one module because the build concatenates every module into a
// single scope, where two top-level `esc` declarations would collide.
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* src/render.js */





// Decision-ish and terminal-ish shapes get semantic colouring from the palette.
const KIND = {
  rhombus: 'decision',
  hexagon: 'decision',
  circle: 'terminal',
  doublecircle: 'terminal',
  stadium: 'terminal',
};
const kindOf = (shape) => KIND[shape] ?? 'process';

function shapeMarkup(n, spec) {
  const { x, y, w, h } = n;
  const r = spec.corner;
  switch (n.shape) {
    case 'rhombus':
      return `<polygon class="fm-node-shape" points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}"/>`;
    case 'hexagon': {
      const i = w * 0.18;
      return `<polygon class="fm-node-shape" points="${x + i},${y} ${x + w - i},${y} ${x + w},${y + h / 2} ${x + w - i},${y + h} ${x + i},${y + h} ${x},${y + h / 2}"/>`;
    }
    case 'parallelogram': {
      const i = w * 0.15;
      return `<polygon class="fm-node-shape" points="${x + i},${y} ${x + w},${y} ${x + w - i},${y + h} ${x},${y + h}"/>`;
    }
    case 'trapezoid': {
      const i = w * 0.14;
      return `<polygon class="fm-node-shape" points="${x + i},${y} ${x + w - i},${y} ${x + w},${y + h} ${x},${y + h}"/>`;
    }
    case 'circle':
      return `<ellipse class="fm-node-shape" cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
    case 'doublecircle':
      return `<ellipse class="fm-node-shape" cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`
        + `<ellipse class="fm-node-shape fm-node-inner" cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2 - 7}" ry="${h / 2 - 7}" fill="none"/>`;
    case 'stadium':
      return `<rect class="fm-node-shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`;
    case 'round':
      return `<rect class="fm-node-shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r * 1.8}"/>`;
    case 'subroutine':
      return `<rect class="fm-node-shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r * 0.4}"/>`
        + `<line class="fm-node-rule" x1="${x + 10}" y1="${y}" x2="${x + 10}" y2="${y + h}"/>`
        + `<line class="fm-node-rule" x1="${x + w - 10}" y1="${y}" x2="${x + w - 10}" y2="${y + h}"/>`;
    case 'cylinder': {
      const e = h * 0.16;
      return `<path class="fm-node-shape" d="M ${x} ${y + e} a ${w / 2} ${e} 0 0 1 ${w} 0 v ${h - e * 2} a ${w / 2} ${e} 0 0 1 ${-w} 0 Z"/>`;
    }
    default:
      return `<rect class="fm-node-shape" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
  }
}

// Greedy wrap on the pre-computed node width, mirroring measure.js.
function wrapLabel(label, n, spec) {
  const maxChars = Math.max(6, Math.floor((n.w - spec.padX * 2) / (spec.fontSize * 0.58)));
  const words = String(label).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// The icon anchors to the top of the node and reports where it ends, so the
// label can be centred in the space beneath it rather than fighting it for the
// middle. Layout has already reserved the height (see layout.js iconSpace).
function iconMarkup(n, spec, iconName) {
  if (!iconName) return { markup: '', bottom: null };
  const size = spec.fontSize * 1.5;
  const scale = size / 24;
  const top = n.y + spec.padY * 0.6;
  const x = n.x + n.w / 2 - size / 2;
  return {
    markup: `<g class="fm-node-icon" aria-hidden="true" transform="translate(${x.toFixed(2)} ${top.toFixed(2)}) scale(${scale.toFixed(4)})">${ICONS[iconName]}</g>`,
    bottom: top + size,
  };
}

function nodeMarkup(n, spec, details, showIcons) {
  const detail = details?.[n.id];
  const iconName = showIcons ? iconFor(n) : null;
  const icon = iconMarkup(n, spec, iconName);
  const lines = wrapLabel(n.label, n, spec);
  const lineH = spec.fontSize * 1.28;

  // With an icon, the label occupies the band between the icon and the bottom
  // padding. Without one, it simply centres on the node.
  const bandTop = icon.bottom === null ? n.y : icon.bottom + spec.padY * 0.35;
  const bandBottom = n.y + n.h - (icon.bottom === null ? 0 : spec.padY * 0.5);
  const centre = (bandTop + bandBottom) / 2;
  const startY = centre - ((lines.length - 1) * lineH) / 2;

  const tspans = lines
    .map((line, i) => `<tspan x="${n.x + n.w / 2}" y="${(startY + i * lineH).toFixed(2)}">${esc(line)}</tspan>`)
    .join('');
  const name = detail?.tooltip ? `${n.label}. ${detail.tooltip}` : n.label;
  return [
    `<g class="fm-node" data-node-id="${esc(n.id)}" data-kind="${kindOf(n.shape)}"`,
    iconName ? ` data-icon="${esc(iconName)}"` : '',
    detail ? ' data-has-detail="true"' : '',
    ` tabindex="0" role="button" aria-label="${esc(name)}">`,
    shapeMarkup(n, spec),
    icon.markup,
    `<text class="fm-node-label" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`,
    '</g>',
  ].join('');
}

function edgeMarkup(e, spec) {
  const marker = e.isBackEdge ? 'fm-arrow-alert' : 'fm-arrow-head';
  const attrs = [
    `data-edge="${esc(e.from)}__${esc(e.to)}"`,
    `data-kind="${e.kind}"`,
    e.isBackEdge ? 'data-back="true"' : '',
    e.arrow === 'none' ? '' : `marker-end="url(#${marker})"`,
    e.arrow === 'bidirectional' ? `marker-start="url(#${marker}-start)"` : '',
  ].filter(Boolean).join(' ');
  const path = `<path class="fm-edge" d="${e.path}" ${attrs}/>`;
  if (!e.label) return path;
  const halfW = e.label.length * spec.labelFontSize * 0.32 + 8;
  const halfH = spec.labelFontSize * 0.85;
  return path
    + `<rect class="fm-edge-label-bg" x="${e.labelPos.x - halfW}" y="${e.labelPos.y - halfH}" width="${halfW * 2}" height="${halfH * 2}" rx="4"/>`
    + `<text class="fm-edge-label" x="${e.labelPos.x}" y="${e.labelPos.y}" text-anchor="middle" dominant-baseline="middle">${esc(e.label)}</text>`;
}
function styleCss(styleKey, tokens, densityKey) {
  const style = getStyle(styleKey);
  const spec = DENSITY[densityKey] ?? DENSITY.standard;
  return style.css(tokens, spec);
}
function renderSvg(model, opts = {}) {
  const spec = DENSITY[model.density] ?? DENSITY.standard;
  const details = opts.details ?? {};
  const arrowSize = Math.max(6, spec.stroke * 2.6);

  const defs = `<defs>`
    + `<marker id="fm-arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${arrowSize}" markerHeight="${arrowSize}" orient="auto-start-reverse"><path class="fm-arrow" d="M 0 0 L 10 5 L 0 10 z"/></marker>`
    + `<marker id="fm-arrow-alert" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${arrowSize}" markerHeight="${arrowSize}" orient="auto-start-reverse"><path class="fm-arrow-alert" d="M 0 0 L 10 5 L 0 10 z"/></marker>`
    + `<marker id="fm-arrow-head-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="${arrowSize}" markerHeight="${arrowSize}" orient="auto"><path class="fm-arrow" d="M 10 0 L 0 5 L 10 10 z"/></marker>`
    + `<marker id="fm-arrow-alert-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="${arrowSize}" markerHeight="${arrowSize}" orient="auto"><path class="fm-arrow-alert" d="M 10 0 L 0 5 L 10 10 z"/></marker>`
    + `</defs>`;

  const subgraphs = (model.subgraphs ?? [])
    .filter((s) => s.w > 0)
    .map((s) => `<g class="fm-subgraph" data-subgraph="${esc(s.id)}">`
      + `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"/>`
      + `<text x="${s.x + 18}" y="${s.y + 22}">${esc(s.label)}</text></g>`)
    .join('');

  const edges = model.edges.map((e) => edgeMarkup(e, spec)).join('');
  const showIcons = opts.showIcons ?? showIconsFor(opts.styleKey);
  const nodes = model.nodes.map((n) => nodeMarkup(n, spec, details, showIcons)).join('');
  const title = opts.meta?.title ? `<title>${esc(opts.meta.title)}</title>` : '';

  return `<svg class="fm-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${model.bounds.w} ${model.bounds.h}" `
    + `width="${model.bounds.w}" height="${model.bounds.h}" role="img" `
    + `aria-label="${esc(opts.meta?.title ?? 'Flow diagram')}">`
    + `${title}${defs}<g class="fm-layer-subgraphs">${subgraphs}</g>`
    + `<g class="fm-layer-edges">${edges}</g><g class="fm-layer-nodes">${nodes}</g></svg>`;
}

/* src/md.js */

const SAFE_URL = /^(https?:\/\/|mailto:|#|\/)/i;

// Inline spans. Input is already escaped, so these only add markup.
function inline(text) {
  return text
    .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_whole, label, href) => {
      const url = href.replace(/&amp;/g, '&');
      if (!SAFE_URL.test(url)) return label;
      return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
}

const isTableDivider = (line) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes('-');
const cells = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
function mdToHtml(md) {
  const source = String(md ?? '').replace(/\r\n?/g, '\n').trimEnd();
  if (source.trim() === '') return '';

  const lines = source.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Fenced code: emit verbatim, escaped.
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*(\S*)\s*$/);
    if (fence) {
      const body = [];
      i += 1;
      while (i < lines.length && !new RegExp(`^\\s*${fence[1][0]}{3,}\\s*$`).test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }

    // Table: a header row followed by a divider row.
    if (line.includes('|') && isTableDivider(lines[i + 1] ?? '')) {
      const head = cells(line).map((c) => `<th>${inline(esc(c))}</th>`).join('');
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        body.push(`<tr>${cells(lines[i]).map((c) => `<td>${inline(esc(c))}</td>`).join('')}</tr>`);
        i += 1;
      }
      out.push(`<table><thead><tr>${head}</tr></thead><tbody>${body.join('')}</tbody></table>`);
      continue;
    }

    // Headings: h3 and below, so a modal never competes with the page h1/h2.
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(6, Math.max(3, heading[1].length));
      out.push(`<h${level}>${inline(esc(heading[2].trim()))}</h${level}>`);
      i += 1;
      continue;
    }

    // Blockquote.
    if (/^\s*>/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${inline(esc(body.join(' ')))}</blockquote>`);
      continue;
    }

    // Lists.
    const bullet = /^\s*[-*+]\s+(.*)$/;
    const numbered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(`<li>${inline(esc(lines[i].match(re)[1]))}</li>`);
        i += 1;
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }

    // Paragraph: consume until a blank line or a construct starts.
    const para = [];
    while (i < lines.length && lines[i].trim() !== ''
      && !/^\s*(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|`{3,}|~{3,})/.test(lines[i])
      && !(lines[i].includes('|') && isTableDivider(lines[i + 1] ?? ''))) {
      para.push(lines[i].trim());
      i += 1;
    }
    if (para.length) out.push(`<p>${inline(esc(para.join(' ')))}</p>`);
  }

  return out.join('\n');
}

/* src/animate.js */
const ANIMATE_CSS = `
.fm-pulse {
  fill: var(--c3);
  filter: drop-shadow(0 0 calc(var(--stroke) * 3) var(--c3));
  pointer-events: none;
}
.fm-pulse[data-back="true"] { fill: var(--c4); filter: drop-shadow(0 0 calc(var(--stroke) * 3) var(--c4)); }
.fm-root[data-anim="off"] .fm-layer-pulses { display: none; }
.fm-root[data-paused="true"] .fm-pulse { animation-play-state: paused; }
@keyframes fm-travel { from { offset-distance: 0%; } to { offset-distance: 100%; } }
@keyframes fm-dash { to { stroke-dashoffset: -1000; } }
.fm-root[data-anim="walkthrough"] .fm-node { transition: opacity .32s ease; }
.fm-root[data-anim="walkthrough"] .fm-edge { transition: opacity .32s ease; }
@media (prefers-reduced-motion: reduce) {
  .fm-pulse { animation: none !important; display: none; }
  .fm-node, .fm-edge { transition: none !important; }
}
`.trim();

// Rank-major, order-minor. Guarantees termination on cyclic graphs and reads
// left-to-right on screen, which is what a booth audience follows.
function walkOrder(model) {
  return [...(model.nodes ?? [])]
    .map((n, i) => ({ id: n.id, rank: n.rank ?? 0, order: n.order ?? 0, i }))
    .sort((a, b) => (a.rank - b.rank) || (a.order - b.order) || (a.i - b.i))
    .map((n) => n.id);
}

const PULSE_MS = { marquee: 2600, standard: 2000, compact: 1700 };
const STEP_MS = { marquee: 2800, standard: 2000, compact: 1500 };
function createAnimator(root, model, opts = {}) {
  const doc = root.ownerDocument;
  const svg = root.querySelector('svg');
  const reduced = opts.prefersReducedMotion
    ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const state = {
    mode: reduced ? 'off' : (opts.mode ?? 'pulse'),
    playing: false,
    paused: false,
    activeIndex: -1,
  };
  const order = walkOrder(model);
  let pulseLayer = null;
  let timer = null;

  function clearPulses() {
    pulseLayer?.remove();
    pulseLayer = null;
  }

  // One dot per edge, positioned with CSS motion paths so the dot follows the
  // exact routed geometry, including the back-edge gutter arcs.
  function buildPulses() {
    clearPulses();
    if (!svg) return;
    const spec = model.density === 'marquee' ? 7 : model.density === 'compact' ? 3 : 4.5;
    pulseLayer = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    pulseLayer.setAttribute('class', 'fm-layer-pulses');
    pulseLayer.setAttribute('aria-hidden', 'true');
    const duration = PULSE_MS[model.density] ?? PULSE_MS.standard;
    model.edges.forEach((e, i) => {
      if (!e.path) return;
      const dot = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'fm-pulse');
      dot.setAttribute('cx', '0');
      dot.setAttribute('cy', '0');
      dot.setAttribute('r', String(spec));
      if (e.isBackEdge) dot.setAttribute('data-back', 'true');
      dot.style.offsetPath = `path("${e.path}")`;
      dot.style.offsetRotate = '0deg';
      dot.style.animation = `fm-travel ${duration}ms linear infinite`;
      // Stagger by index so the whole diagram does not strobe in lockstep.
      dot.style.animationDelay = `${(i % 5) * (duration / 5)}ms`;
      pulseLayer.appendChild(dot);
    });
    svg.appendChild(pulseLayer);
  }

  function paintWalk() {
    const activeId = order[state.activeIndex];
    for (const el of root.querySelectorAll('.fm-node')) {
      const isActive = el.dataset.nodeId === activeId;
      el.dataset.active = isActive ? 'true' : 'false';
      el.dataset.dimmed = state.mode === 'walkthrough' && !isActive ? 'true' : 'false';
    }
    for (const el of root.querySelectorAll('.fm-edge')) {
      const touching = el.dataset.edge?.split('__').includes(activeId);
      el.style.opacity = state.mode === 'walkthrough' && !touching ? '.45' : '';
    }
    if (activeId && opts.onStep) opts.onStep(activeId, state.activeIndex, order.length);
    if (activeId && opts.scrollTo) opts.scrollTo(model.nodes.find((n) => n.id === activeId));
  }

  function clearWalkPaint() {
    for (const el of root.querySelectorAll('.fm-node')) {
      el.dataset.active = 'false';
      el.dataset.dimmed = 'false';
    }
    for (const el of root.querySelectorAll('.fm-edge')) el.style.opacity = '';
  }

  function tick() {
    if (state.paused || state.mode !== 'walkthrough' || !state.playing) return;
    state.activeIndex = (state.activeIndex + 1) % Math.max(1, order.length);
    paintWalk();
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();
    if (state.mode !== 'walkthrough' || !state.playing || state.paused) return;
    timer = setInterval(tick, STEP_MS[model.density] ?? STEP_MS.standard);
  }

  function applyMode() {
    root.dataset.anim = state.mode;
    stopTimer();
    clearPulses();
    clearWalkPaint();
    if (state.mode === 'pulse') {
      buildPulses();
      state.playing = true;
    } else if (state.mode === 'walkthrough') {
      if (state.activeIndex < 0) state.activeIndex = 0;
      state.playing = true;
      paintWalk();
      startTimer();
    } else {
      state.playing = false;
    }
  }

  applyMode();

  return {
    setMode(mode) {
      state.mode = ['pulse', 'walkthrough', 'off'].includes(mode) ? mode : 'off';
      applyMode();
    },
    play() {
      state.playing = true;
      root.dataset.paused = 'false';
      startTimer();
    },
    stop() {
      state.playing = false;
      stopTimer();
    },
    pause() {
      state.paused = true;
      root.dataset.paused = 'true';
      stopTimer();
    },
    resume() {
      state.paused = false;
      root.dataset.paused = 'false';
      startTimer();
    },
    next() {
      state.activeIndex = (state.activeIndex + 1) % Math.max(1, order.length);
      paintWalk();
    },
    prev() {
      state.activeIndex = (state.activeIndex - 1 + order.length) % Math.max(1, order.length);
      paintWalk();
    },
    getState: () => ({ ...state, activeId: order[state.activeIndex] ?? null, total: order.length }),
    destroy() {
      stopTimer();
      clearPulses();
      clearWalkPaint();
    },
  };
}

/* src/runtime.js */
const RUNTIME_CSS = `
.fm-tooltip {
  position: absolute; z-index: 40; max-width: 34ch; pointer-events: none;
  padding: .6em .8em; border-radius: 10px; opacity: 0;
  transition: opacity .14s ease;
  background: var(--surface); color: var(--ink);
  border: 1px solid var(--border);
  box-shadow: 0 10px 30px rgb(0 0 0 / .22);
  font-size: 1rem; line-height: 1.4;
}
.fm-tooltip[data-open="true"] { opacity: 1; }
.fm-modal-backdrop {
  position: fixed; inset: 0; z-index: 50; display: grid; place-items: center;
  padding: 4vmin; background: rgb(0 0 0 / .5); opacity: 0; visibility: hidden;
  transition: opacity .18s ease, visibility .18s ease;
}
.fm-modal-backdrop[data-open="true"] { opacity: 1; visibility: visible; }
.fm-modal {
  width: min(72ch, 100%); max-height: 86vh; overflow: auto;
  background: var(--surface); color: var(--ink);
  border: 1px solid var(--border); border-radius: 16px;
  box-shadow: 0 24px 70px rgb(0 0 0 / .38);
  padding: clamp(1.2rem, 3vw, 2.2rem);
  transform: translateY(10px) scale(.985); transition: transform .18s ease;
}
.fm-modal-backdrop[data-open="true"] .fm-modal { transform: none; }
.fm-modal-eyebrow { margin: 0; color: var(--c1); font-size: .8rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.fm-modal h2 { margin: .2em 0 .6em; font-size: clamp(1.4rem, 3vw, 2rem); line-height: 1.15; }
.fm-modal-lede { color: var(--ink-dim); font-size: 1.05rem; margin: 0 0 1.2em; }
.fm-modal-body > * + * { margin-top: .9em; }
.fm-modal-body table { width: 100%; border-collapse: collapse; }
.fm-modal-body th, .fm-modal-body td { text-align: left; padding: .45em .6em; border-bottom: 1px solid var(--border); }
.fm-modal-body th { color: var(--ink-dim); font-size: .82em; letter-spacing: .06em; text-transform: uppercase; }
.fm-modal-body pre { background: var(--surface-2); padding: .8em; border-radius: 8px; overflow-x: auto; }
.fm-modal-body code { background: var(--surface-2); padding: .1em .35em; border-radius: 4px; font-size: .92em; }
.fm-modal-body blockquote { margin: 0; border-left: 3px solid var(--c1); padding-left: .9em; color: var(--ink-dim); }
.fm-modal-body a { color: var(--c1); }
.fm-modal-close {
  position: sticky; top: 0; float: right; margin: -.4rem -.4rem 0 0;
  width: 2.2rem; height: 2.2rem; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--border); background: var(--surface-2); color: var(--ink);
  font-size: 1.1rem; line-height: 1;
}
.fm-modal-close:focus-visible { outline: 2px solid var(--c2); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .fm-tooltip, .fm-modal-backdrop, .fm-modal { transition: none; }
}
`.trim();

const FOCUSABLE = 'a[href], button, [tabindex]:not([tabindex="-1"])';
const cssEscape = (s) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'));
function attachRuntime(root, config = {}) {
  const details = config.details ?? {};
  const model = config.model ?? { nodes: [], edges: [] };
  const doc = root.ownerDocument;

  const tooltip = doc.createElement('div');
  tooltip.className = 'fm-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  root.appendChild(tooltip);

  // The modal is fixed-position chrome. Mounting it inside the pannable canvas
  // let the canvas capture the pointer and swallow clicks meant for the modal,
  // so it lives on the styled root instead (which still supplies the tokens).
  const chromeHost = root.closest('.fm-root') ?? doc.body;

  const backdrop = doc.createElement('div');
  backdrop.className = 'fm-modal-backdrop';
  backdrop.innerHTML = '<div class="fm-modal" role="dialog" aria-modal="true" aria-labelledby="fm-modal-title">'
    + '<button class="fm-modal-close" type="button" aria-label="Close details">&times;</button>'
    + '<p class="fm-modal-eyebrow"></p><h2 id="fm-modal-title"></h2>'
    + '<p class="fm-modal-lede"></p><div class="fm-modal-body"></div></div>';
  chromeHost.appendChild(backdrop);

  const modal = backdrop.querySelector('.fm-modal');
  const closeBtn = backdrop.querySelector('.fm-modal-close');
  let lastFocus = null;
  let hoverPauses = 0;

  const animator = createAnimator(root, model, {
    mode: config.animationMode ?? 'pulse',
    prefersReducedMotion: config.prefersReducedMotion,
    onStep: config.onStep,
    scrollTo: config.scrollTo,
  });

  const elFor = (id) => root.querySelector(`.fm-node[data-node-id="${cssEscape(id)}"]`);

  function showTooltip(el) {
    const id = el.dataset.nodeId;
    const detail = details[id];
    if (!detail?.tooltip) return;
    tooltip.textContent = detail.tooltip;
    tooltip.dataset.open = 'true';
    const box = el.getBoundingClientRect();
    const host = root.getBoundingClientRect();
    tooltip.style.left = `${box.left - host.left + box.width / 2 + root.scrollLeft}px`;
    tooltip.style.top = `${box.top - host.top - 12 + root.scrollTop}px`;
    tooltip.style.transform = 'translate(-50%, -100%)';
  }

  function hideTooltip() {
    tooltip.dataset.open = 'false';
  }

  // Everything that freezes motion goes through these two, so the pulse, the
  // walkthrough, and the auto-scroll always stop and start together.
  function pauseAll() {
    animator.pause();
    config.onPause?.();
  }

  function resumeAll() {
    animator.resume();
    config.onResume?.();
  }

  function pauseForHover() {
    hoverPauses += 1;
    if (hoverPauses === 1) pauseAll();
  }

  function resumeAfterHover() {
    hoverPauses = Math.max(0, hoverPauses - 1);
    if (hoverPauses === 0 && backdrop.dataset.open !== 'true') resumeAll();
  }

  function openModal(id) {
    const detail = details[id];
    if (!detail) return;
    lastFocus = doc.activeElement;
    backdrop.querySelector('.fm-modal-eyebrow').textContent = detail.id;
    backdrop.querySelector('#fm-modal-title').textContent = detail.title || detail.id;
    const lede = backdrop.querySelector('.fm-modal-lede');
    lede.textContent = detail.tooltip ?? '';
    lede.hidden = !detail.tooltip;
    backdrop.querySelector('.fm-modal-body').innerHTML = mdToHtml(detail.bodyMd);
    backdrop.dataset.open = 'true';
    pauseAll();
    hideTooltip();
    closeBtn.focus();
  }

  function closeModal() {
    if (backdrop.dataset.open !== 'true') return;
    backdrop.dataset.open = 'false';
    if (hoverPauses === 0) resumeAll();
    if (lastFocus?.focus) lastFocus.focus();
    lastFocus = null;
  }

  // Arrow keys walk the graph: forward along outgoing edges, back along incoming.
  function step(fromId, forward) {
    const edges = model.edges.filter((e) => (forward ? e.from === fromId : e.to === fromId));
    const targetId = edges[0]?.[forward ? 'to' : 'from'];
    if (targetId && targetId !== fromId) return targetId;
    const ids = model.nodes.map((n) => n.id);
    const idx = ids.indexOf(fromId);
    return ids[Math.min(ids.length - 1, Math.max(0, idx + (forward ? 1 : -1)))];
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (backdrop.dataset.open === 'true') {
      if (event.key !== 'Tab') return;
      const items = [...modal.querySelectorAll(FOCUSABLE)].filter((el) => !el.hidden);
      if (items.length === 0) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    const active = doc.activeElement?.closest?.('.fm-node');
    if (!active) return;
    const id = active.dataset.nodeId;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openModal(id);
      return;
    }
    const forwardKeys = ['ArrowRight', 'ArrowDown'];
    const backKeys = ['ArrowLeft', 'ArrowUp'];
    if (forwardKeys.includes(event.key) || backKeys.includes(event.key)) {
      event.preventDefault();
      const next = elFor(step(id, forwardKeys.includes(event.key)));
      if (next) {
        next.focus();
        showTooltip(next);
      }
    }
  }

  const onOver = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (n) {
      showTooltip(n);
      pauseForHover();
    }
  };
  const onOut = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (n) {
      hideTooltip();
      resumeAfterHover();
    }
  };
  const onFocusIn = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (n) {
      showTooltip(n);
      pauseForHover();
    }
  };
  const onFocusOut = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (n) {
      hideTooltip();
      resumeAfterHover();
    }
  };
  const onClick = (e) => {
    const n = e.target.closest?.('.fm-node');
    if (n?.dataset.hasDetail === 'true') openModal(n.dataset.nodeId);
  };
  const onBackdrop = (e) => {
    if (e.target === backdrop) closeModal();
  };

  root.addEventListener('pointerover', onOver);
  root.addEventListener('pointerout', onOut);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  root.addEventListener('click', onClick);
  backdrop.addEventListener('click', onBackdrop);
  closeBtn.addEventListener('click', closeModal);
  doc.addEventListener('keydown', onKeyDown);

  return {
    animator,
    setAnimationMode: (mode) => animator.setMode(mode),
    pause: pauseAll,
    resume: resumeAll,
    focusNode: (id) => {
      const el = elFor(id);
      if (el) {
        el.focus();
        showTooltip(el);
      }
    },
    openModal,
    closeModal,
    destroy() {
      animator.destroy();
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      root.removeEventListener('click', onClick);
      backdrop.removeEventListener('click', onBackdrop);
      closeBtn.removeEventListener('click', closeModal);
      doc.removeEventListener('keydown', onKeyDown);
      tooltip.remove();
      backdrop.remove();
    },
  };
}

/* src/canvas.js */
const MIN_ZOOM = 0.15;
// Auto-scroll speed in CSS pixels per second, by density. A marquee is read
// from a distance by someone walking past, so it crawls; compact is for someone
// sitting in front of it and can move faster.
const SCROLL_PX_PER_SEC = { marquee: 42, standard: 60, compact: 75 };
const SCROLL_HOLD_MS = 1600;
const MAX_ZOOM = 4;
const NARROW_BREAKPOINT = 720;
const PAD = 32;
const CANVAS_CSS = `
.fm-canvas {
  position: relative;
  display: flex;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  background: var(--ground);
  cursor: grab;
  touch-action: pan-x pan-y;
}
.fm-canvas[data-panning="true"] { cursor: grabbing; user-select: none; }
.fm-stage { transform-origin: 0 0; will-change: transform; margin: auto; }
.fm-canvas svg { display: block; overflow: visible; }
.fm-canvas::-webkit-scrollbar { height: 12px; width: 12px; }
.fm-canvas::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
@media (max-width: ${NARROW_BREAKPOINT}px) {
  .fm-canvas[data-reflow="vertical"] { overflow-x: hidden; }
  .fm-canvas[data-reflow="vertical"] .fm-stage { width: 100%; }
}
`.trim();

const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
// How long to wait for a first animation frame before assuming the page is not
// being painted, and the interval the fallback driver runs at.
const FRAME_WAIT_MS = 400;
const TIMER_INTERVAL_MS = 33;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : 0);

// One step of the auto-scroll crawl, as a pure function of the current state.
// Extracted so the ping-pong and hold behaviour can be tested with a fake clock
// instead of a live browser frame loop.
//   pos      current scroll offset (float, sub-pixel)
//   dir      +1 travelling forward, -1 travelling back
//   max      the maximum scrollable offset
//   dt       seconds since the previous step
//   speed    pixels per second
//   now      current timestamp in ms
//   holdUntil timestamp before which the crawl waits at an end
function advanceScroll({ pos, dir, max, dt, speed, now, holdUntil }) {
  if (max <= 1) return { pos, dir, holdUntil, moved: false };
  if (now < holdUntil) return { pos, dir, holdUntil, moved: false };

  let next = pos + dir * speed * dt;
  let nextDir = dir;
  let nextHold = holdUntil;

  if (next >= max) {
    next = max;
    nextDir = -1;
    nextHold = now + SCROLL_HOLD_MS;
  } else if (next <= 0) {
    next = 0;
    nextDir = 1;
    nextHold = now + SCROLL_HOLD_MS;
  }
  return { pos: next, dir: nextDir, holdUntil: nextHold, moved: true };
}
function fitScale(bounds, viewport, mode = 'both') {
  const w = Number(bounds?.w) || 0;
  const h = Number(bounds?.h) || 0;
  const vw = Math.max(1, (Number(viewport?.w) || 0) - PAD);
  const vh = Math.max(1, (Number(viewport?.h) || 0) - PAD);
  const byW = w > 0 ? vw / w : MAX_ZOOM;
  const byH = h > 0 ? vh / h : MAX_ZOOM;
  if (mode === 'width') return clampZoom(byW);
  if (mode === 'height') return clampZoom(byH);
  return clampZoom(Math.min(byW, byH));
}

// A horizontal flow becomes an unreadable hairline once the viewport is much
// narrower than the diagram. Below the breakpoint, stack the steps instead.
function shouldReflowVertical(viewportWidth, bounds) {
  const vw = Number(viewportWidth) || 0;
  const w = Number(bounds?.w) || 0;
  if (vw > NARROW_BREAKPOINT) return false;
  return w > vw * 1.6;
}
function createCanvas(container, model, opts = {}) {
  const stage = container.querySelector('.fm-stage') ?? container.firstElementChild;
  let zoom = opts.zoom ?? 1;
  let panning = false;
  let origin = { x: 0, y: 0, left: 0, top: 0 };

  function apply() {
    stage.style.transform = `scale(${zoom})`;
    stage.style.width = `${model.bounds.w * zoom}px`;
    stage.style.height = `${model.bounds.h * zoom}px`;
    container.dataset.reflow = shouldReflowVertical(container.clientWidth, model.bounds) ? 'vertical' : 'horizontal';
    opts.onZoom?.(zoom);
  }

  const viewport = () => ({ w: container.clientWidth, h: container.clientHeight });

  const NO_PAN = '.fm-node, .fm-modal-backdrop, .fm-tooltip, button, a, input, select, textarea';

  function onPointerDown(e) {
    // Panning must never start on a node or on interface chrome: capturing the
    // pointer here would retarget the click and swallow it.
    if (e.target.closest(NO_PAN)) return;
    panning = true;
    if (scrollWanted) stopAutoScroll();
    container.dataset.panning = 'true';
    container.setPointerCapture?.(e.pointerId);
    origin = { x: e.clientX, y: e.clientY, left: container.scrollLeft, top: container.scrollTop };
  }

  function onPointerMove(e) {
    if (!panning) return;
    container.scrollLeft = origin.left - (e.clientX - origin.x);
    container.scrollTop = origin.top - (e.clientY - origin.y);
  }

  function onPointerUp(e) {
    panning = false;
    container.dataset.panning = 'false';
    try {
      container.releasePointerCapture?.(e.pointerId);
    } catch {
      /* pointer already released */
    }
  }

  // Ctrl/Cmd + wheel zooms around the cursor; a plain wheel scrolls normally.
  function onWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const box = container.getBoundingClientRect();
    const px = (container.scrollLeft + e.clientX - box.left) / zoom;
    const py = (container.scrollTop + e.clientY - box.top) / zoom;
    zoom = clampZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
    apply();
    container.scrollLeft = px * zoom - (e.clientX - box.left);
    container.scrollTop = py * zoom - (e.clientY - box.top);
  }

  // The first render happens before the grid has laid out, so clientWidth and
  // clientHeight are meaningless. Wait for the first real measurement, then fit
  // once. Without this the diagram loads at a nonsense zoom.
  let autoFitDone = false;
  function fitDefault() {
    const byHeight = fitScale(model.bounds, viewport(), 'height');
    const byWidth = fitScale(model.bounds, viewport(), 'width');
    zoom = clampZoom(Math.min(1, Math.max(byHeight, byWidth)));
    apply();
  }

  // Continuous horizontal crawl for long flows. Ping-pongs rather than jumping
  // back to the start, because a hard jump reads as a glitch on a booth screen.
  let scrollRAF = null;
  let scrollDir = 1;
  let holdUntil = 0;
  let lastFrame = 0;
  let scrollPaused = false;
  let scrollWanted = false;
  // The crawl advances a fraction of a pixel per frame at 120Hz, and scrollLeft
  // rounds to whole pixels, so the movement would be discarded every frame.
  // Accumulate the true position here and write the rounded value out.
  let scrollPos = 0;
  let scrollTimer = null;
  let fallbackCheck = null;
  let sawFrame = false;

  const scrollAxis = () => (model.direction === 'TD' || model.direction === 'BT' ? 'top' : 'left');

  function scrollFrame(now) {
    sawFrame = true;
    // Only the rAF driver reschedules itself; the timer driver repeats on its own.
    if (scrollTimer === null) scrollRAF = requestAnimationFrame(scrollFrame);
    if (scrollPaused) { lastFrame = now; return; }
    const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    const axis = scrollAxis();
    const actual = axis === 'left' ? container.scrollLeft : container.scrollTop;
    const max = axis === 'left'
      ? container.scrollWidth - container.clientWidth
      : container.scrollHeight - container.clientHeight;

    // If something else moved the view (a walkthrough step, a jump to a node),
    // adopt that position rather than yanking it back.
    if (Math.abs(actual - scrollPos) > 2) scrollPos = actual;

    const step = advanceScroll({
      pos: scrollPos,
      dir: scrollDir,
      max,
      dt,
      speed: SCROLL_PX_PER_SEC[model.density] ?? SCROLL_PX_PER_SEC.standard,
      now,
      holdUntil,
    });
    scrollPos = step.pos;
    scrollDir = step.dir;
    holdUntil = step.holdUntil;
    if (!step.moved) return;

    if (axis === 'left') container.scrollLeft = Math.round(scrollPos);
    else container.scrollTop = Math.round(scrollPos);
  }

  // requestAnimationFrame is the right driver when the page is being painted,
  // but a browser that considers the window occluded (a kiosk behind another
  // window, some secondary-display setups) stops delivering frames entirely and
  // the crawl would silently freeze. Fall back to a timer when no frame arrives.
  function startAutoScroll() {
    scrollWanted = true;
    container.dataset.autoscroll = 'true';
    if (scrollRAF !== null || scrollTimer !== null) return;
    lastFrame = 0;
    holdUntil = 0;
    sawFrame = false;
    scrollPos = scrollAxis() === 'left' ? container.scrollLeft : container.scrollTop;
    scrollRAF = requestAnimationFrame(scrollFrame);
    fallbackCheck = setTimeout(() => {
      fallbackCheck = null;
      if (!scrollWanted || sawFrame) return;
      if (scrollRAF !== null) { cancelAnimationFrame(scrollRAF); scrollRAF = null; }
      lastFrame = 0;
      scrollTimer = setInterval(() => scrollFrame(nowMs()), TIMER_INTERVAL_MS);
    }, FRAME_WAIT_MS);
  }

  function stopAutoScroll() {
    scrollWanted = false;
    container.dataset.autoscroll = 'false';
    if (scrollRAF !== null) { cancelAnimationFrame(scrollRAF); scrollRAF = null; }
    if (scrollTimer !== null) { clearInterval(scrollTimer); scrollTimer = null; }
    if (fallbackCheck !== null) { clearTimeout(fallbackCheck); fallbackCheck = null; }
  }

  const onResize = () => {
    if (!autoFitDone && container.clientWidth > 1 && container.clientHeight > 1) {
      autoFitDone = true;
      if (opts.autoFit !== false) {
        fitDefault();
        return;
      }
    }
    apply();
  };

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);
  container.addEventListener('wheel', onWheel, { passive: false });
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
  if (resizeObserver) resizeObserver.observe(container);
  else if (opts.autoFit !== false) { autoFitDone = true; fitDefault(); }

  apply();

  return {
    setZoom(z) {
      zoom = clampZoom(z);
      apply();
    },
    zoomBy(f) {
      zoom = clampZoom(zoom * f);
      apply();
    },
    fitWidth() {
      zoom = fitScale(model.bounds, viewport(), 'width');
      apply();
    },
    fitHeight() {
      zoom = fitScale(model.bounds, viewport(), 'height');
      apply();
    },
    fitBoth() {
      zoom = fitScale(model.bounds, viewport(), 'both');
      apply();
    },
    // The default view for a horizontal flow: fill the available height so the
    // type is as large as possible, and let the user scroll sideways. Never
    // magnifies past 1:1, because an upscaled small diagram looks broken.
    fitDefault() {
      autoFitDone = true;
      fitDefault();
    },
    actualSize() {
      zoom = 1;
      apply();
    },
    getZoom: () => zoom,
    scrollToNode(node) {
      if (!node) return;
      const targetLeft = node.x * zoom - container.clientWidth / 2 + (node.w * zoom) / 2;
      const targetTop = node.y * zoom - container.clientHeight / 2 + (node.h * zoom) / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), top: Math.max(0, targetTop), behavior: 'smooth' });
    },
    // Hover, focus, and an open modal all freeze the crawl, matching the
    // animation pause so the whole diagram stops together.
    pauseAutoScroll() { scrollPaused = true; },
    resumeAutoScroll() {
      scrollPaused = false;
      lastFrame = 0;
      scrollPos = scrollAxis() === 'left' ? container.scrollLeft : container.scrollTop;
    },
    startAutoScroll,
    stopAutoScroll,
    isAutoScrolling: () => scrollWanted,
    destroy() {
      stopAutoScroll();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      resizeObserver?.disconnect();
    },
  };
}

/* src/measure.js */

function estimate(label, { fontSize, padX, padY, minNodeW, nodeH }) {
  const charW = fontSize * 0.58;
  const maxTextW = MAX_LABEL_W - padX * 2;
  const oneLineW = String(label).length * charW;
  const lines = Math.max(1, Math.ceil(oneLineW / maxTextW));
  return {
    w: Math.round(Math.min(MAX_LABEL_W, Math.max(minNodeW, oneLineW + padX * 2))),
    h: Math.round(Math.max(nodeH, lines * fontSize * 1.35 + padY * 2)),
  };
}

// Real measurement with the actual font, so a browser layout matches what the
// user sees. Falls back to the estimator under Node so layout stays testable.
function browserMeasure(spec, fontFamily) {
  if (typeof document === 'undefined') return (label) => estimate(label, spec);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('data-fm-measure', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('font-size', String(spec.fontSize));
  text.setAttribute('font-family', fontFamily);
  text.setAttribute('font-weight', '700');
  svg.appendChild(text);
  document.body.appendChild(svg);

  const widthOf = (s) => {
    text.textContent = s;
    try {
      return text.getComputedTextLength();
    } catch {
      return s.length * spec.fontSize * 0.58;
    }
  };

  return (label) => {
    const maxTextW = MAX_LABEL_W - spec.padX * 2;
    const words = String(label).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && widthOf(candidate) > maxTextW) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    const widest = lines.length ? Math.max(...lines.map(widthOf)) : 0;
    return {
      w: Math.round(Math.min(MAX_LABEL_W, Math.max(spec.minNodeW, widest + spec.padX * 2))),
      h: Math.round(Math.max(spec.nodeH, Math.max(1, lines.length) * spec.fontSize * 1.35 + spec.padY * 2)),
      lines,
    };
  };
}
function cleanupMeasure() {
  if (typeof document === 'undefined') return;
  for (const el of document.querySelectorAll('svg[data-fm-measure="true"]')) el.remove();
}

/* src/export-runtime.js */








const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
function bootExport() {
  const data = window.__FLOWMAKER_DATA__;
  if (!data) return;
  const root = document.getElementById('fm-root');
  const host = document.getElementById('fm-canvas');
  const stage = document.getElementById('fm-stage');
  if (!root || !host || !stage) return;
  const spec = DENSITY[data.density] ?? DENSITY.standard;

  // Re-run layout on load with real measurement, so one exported file is
  // correct on a 4K marquee and on a phone.
  const model = layout(data.graph, {
    direction: data.direction,
    density: data.density,
    measure: browserMeasure(spec, FONT_STACK),
    iconSpace: showIconsFor(data.styleKey),
  });

  stage.innerHTML = renderSvg(model, {
    styleKey: data.styleKey,
    palette: getPalette(data.paletteKey),
    meta: data.meta,
    details: data.details,
  });

  const canvas = createCanvas(host, model, {});
  const runtime = attachRuntime(host, {
    details: data.details,
    model,
    animationMode: data.animationMode,
    scrollTo: (node) => canvas.scrollToNode(node),
    // Hovering a step freezes the crawl as well as the pulse.
    onPause: () => canvas.pauseAutoScroll(),
    onResume: () => canvas.resumeAutoScroll(),
  });

  const setScroll = (on) => {
    if (on) canvas.startAutoScroll();
    else canvas.stopAutoScroll();
    for (const b of root.querySelectorAll('[data-fm-action="toggle-scroll"]')) {
      b.setAttribute('aria-pressed', String(on));
    }
  };

  let scrollBeforePresent = false;
  const setPresenting = (on) => {
    root.dataset.present = String(on);
    root.querySelector('#fm-present-exit').hidden = !on;
    if (on) {
      scrollBeforePresent = canvas.isAutoScrolling();
      setScroll(true);
      root.requestFullscreen?.().catch(() => { /* denied: in-page mode still applies */ });
    } else {
      setScroll(scrollBeforePresent);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
    requestAnimationFrame(() => canvas.fitDefault());
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.dataset.present === 'true') setPresenting(false);
  });
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && root.dataset.present === 'true') setPresenting(false);
  });

  if (data.autoScroll ?? data.animationMode === 'pulse') setScroll(true);

  const setPressed = (action) => {
    for (const b of root.querySelectorAll('[data-fm-action^="anim-"]')) {
      b.setAttribute('aria-pressed', String(b.dataset.fmAction === action));
    }
  };
  setPressed(`anim-${data.animationMode === 'walkthrough' ? 'walk' : data.animationMode}`);

  root.addEventListener('click', (e) => {
    const action = e.target.closest('[data-fm-action]')?.dataset.fmAction;
    if (!action) return;
    if (action === 'anim-pulse') { runtime.setAnimationMode('pulse'); setPressed(action); setScroll(true); }
    if (action === 'anim-walk') { runtime.setAnimationMode('walkthrough'); setPressed(action); setScroll(false); }
    if (action === 'anim-off') { runtime.setAnimationMode('off'); setPressed(action); setScroll(false); }
    if (action === 'fit-width') canvas.fitDefault();
    if (action === 'zoom-in') canvas.zoomBy(1.2);
    if (action === 'zoom-out') canvas.zoomBy(1 / 1.2);
    if (action === 'toggle-scroll') setScroll(!canvas.isAutoScrolling());
    if (action === 'present') setPresenting(true);
    if (action === 'exit-present') setPresenting(false);
  });

}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootExport);
  else bootExport();
}

})();