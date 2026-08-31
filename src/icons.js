// Every icon is inline SVG geometry on a 24x24 grid, stroke-based so it inherits
// currentColor and the style's stroke weight. No emoji, no icon font, no raster,
// no network. Each one is a handful of primitives: these are read from across a
// room, not inspected up close.
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
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
  human: `<circle ${S} cx="12" cy="7.4" r="3.4"/><path ${S} d="M5.4 20.4a6.6 6.6 0 0 1 13.2 0"/><path ${S} d="M12 10.8v3"/>`,
  team: `<circle ${S} cx="8.6" cy="8.6" r="3"/><circle ${S} cx="16.4" cy="9.4" r="2.4"/><path ${S} d="M3.4 19a5.2 5.2 0 0 1 10.4 0"/><path ${S} d="M14.6 15.6a4.4 4.4 0 0 1 6 3.4"/>`,
  handoff: `<path ${S} d="M3 12h13"/><polyline ${S} points="12.4 7.6 17 12 12.4 16.4"/><path ${S} d="M19.4 5.6v12.8"/>`,
  review: `<path ${S} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/><polyline ${S} points="14 3 14 8 19 8"/><polyline ${S} points="8.6 13.6 10.6 15.6 15 11"/>`,
  contract: `<path ${S} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline ${S} points="14 3 14 8 19 8"/><path ${S} d="M8.6 16.6c1.6-2.4 2.6-2.4 3.4-.8s1.8 1.2 3.4-1.2"/>`,
  form: `<rect ${S} x="4.6" y="3" width="14.8" height="18" rx="2"/><line ${S} x1="8" y1="8" x2="16" y2="8"/><line ${S} x1="8" y1="12" x2="16" y2="12"/><line ${S} x1="8" y1="16" x2="12.4" y2="16"/>`,
  api: `<rect ${S} x="3" y="7.4" width="18" height="9.2" rx="3"/><line ${S} x1="8.4" y1="12" x2="8.4" y2="12"/><circle cx="8.4" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="15.6" cy="12" r="1.2" fill="currentColor"/>`,
  cloud: `<path ${S} d="M7.4 18.6a4.4 4.4 0 0 1-.4-8.8 5.6 5.6 0 0 1 10.7 1.3 3.8 3.8 0 0 1-.7 7.5z"/>`,
  queue: `<rect ${S} x="3" y="6" width="4.4" height="12" rx="1.4"/><rect ${S} x="9.8" y="6" width="4.4" height="12" rx="1.4"/><rect ${S} x="16.6" y="6" width="4.4" height="12" rx="1.4"/>`,
  retry: `<path ${S} d="M20.4 12a8.4 8.4 0 1 1-2.5-6"/><polyline ${S} points="20.6 3.8 20.6 9 15.4 9"/>`,
  stop: `<circle ${S} cx="12" cy="12" r="9"/><line ${S} x1="8.2" y1="8.2" x2="15.8" y2="15.8"/>`,
  flag: `<path ${S} d="M5.4 21V4"/><path ${S} d="M5.4 5.2h11.4l-2 3.4 2 3.4H5.4z"/>`,
  calendar: `<rect ${S} x="3.6" y="5.4" width="16.8" height="15" rx="2"/><line ${S} x1="3.6" y1="10" x2="20.4" y2="10"/><line ${S} x1="8.4" y1="3" x2="8.4" y2="6.6"/><line ${S} x1="15.6" y1="3" x2="15.6" y2="6.6"/>`,
};

export const ICON_NAMES = Object.keys(ICONS);

// The other names people reach for. Writing `doc:` rather than `document:` is
// what anyone actually types, and being told it is not an icon helps nobody.
export const ICON_ALIASES = {
  doc: 'document', file: 'document', spec: 'document', report: 'chart',
  bot: 'agent', robot: 'agent', ai: 'agent', llm: 'agent',
  user: 'person', customer: 'person', people: 'team', group: 'team',
  db: 'database', warehouse: 'database', store: 'database',
  warn: 'alert', warning: 'alert', error: 'alert', fail: 'stop', reject: 'stop',
  ok: 'check', approved: 'check', done: 'check', pass: 'check',
  cal: 'calendar', schedule: 'calendar', wait: 'clock', sla: 'clock',
  msg: 'mail', email: 'mail', notify: 'mail',
  pkg: 'box', package: 'box', ship: 'truck', deliver: 'truck',
  rework: 'retry', resubmit: 'retry', payment: 'money', invoice: 'money',
  sheet: 'table', spreadsheet: 'table', service: 'api', endpoint: 'api',
  policy: 'shield', compliance: 'shield', secure: 'lock',
  signoff: 'review', approve: 'review', milestone: 'flag', launch: 'flag',
  handover: 'handoff', queue: 'queue',
};

// The icon a name refers to, whichever of its names was used.
export function resolveIconName(name) {
  const key = String(name ?? '').trim().toLowerCase();
  if (ICONS[key]) return key;
  const alias = ICON_ALIASES[key];
  return alias && ICONS[alias] ? alias : null;
}

// What each icon is for. The studio renders this as a reference sheet and the
// authoring prompt hands it to whoever is writing the file, so a tag is chosen
// from a list rather than guessed at.
export const ICON_GUIDE = {
  document: 'A document, spec, or written artifact handed from one step to the next.',
  review: 'A document that has been checked and signed off.',
  contract: 'A signed agreement: a contract, an SOW, a terms acceptance.',
  form: 'A form or application someone fills in.',
  table: 'A spreadsheet, a report, or tabular data.',
  chart: 'Analysis, metrics, or a result being reported.',
  database: 'A system of record: a database or warehouse the step reads or writes.',
  folder: 'A collection of files, a case file, or a repository.',
  api: 'A call to a service or an interface between systems.',
  cloud: 'A hosted or third-party service outside your own systems.',
  queue: 'Work waiting in a queue, a batch, or a backlog.',
  code: 'Code: a change, a build, or a deployment artifact.',
  decision: 'A branch point where the flow chooses a path.',
  check: 'A successful outcome: approved, passed, complete.',
  stop: 'A terminal failure: rejected, cancelled, abandoned.',
  alert: 'Something has gone wrong and needs attention.',
  retry: 'Work going back to be done again: rework, resubmission, a retry.',
  clock: 'Waiting: an SLA, a delay, or a timed step.',
  calendar: 'A scheduled or recurring step.',
  human: 'A step a person does, as opposed to a system.',
  person: 'A named individual, a role, or a customer.',
  team: 'A group, a department, or a committee.',
  agent: 'A step an automated agent or bot does, as opposed to a person.',
  gear: 'Automated processing or configuration.',
  handoff: 'Work passing from one owner to another.',
  money: 'Payment, billing, cost, or revenue.',
  mail: 'A notification, an email, or a message sent.',
  search: 'Investigation, lookup, or discovery.',
  shield: 'A control, a policy, or a compliance gate.',
  lock: 'Access control, encryption, or something restricted.',
  flag: 'A milestone, a launch, or something raised for attention.',
  box: 'A package, a release, or a physical item.',
  truck: 'Shipping, delivery, or logistics.',
  start: 'Where the flow begins.',
  end: 'Where the flow finishes.',
};


// Only the Infographic style shows icons. Layout reserves vertical space and
// the renderer emits the slot based on this, so the two never disagree.
export function showIconsFor(styleKey) {
  return styleKey === 'infographic';
}

// Icons are a property of the document, not of the style. Infographic is built
// around them so it shows them by default, but any style can carry them and a
// diagram that has been tagged for icons should not lose them on a style
// change. `auto` keeps the old behaviour, which is what most files want.
export function showIcons(styleKey, mode = 'auto') {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return showIconsFor(styleKey);
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

export function iconFor(node) {
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

// What an attachment is: a document, a data store, a service. The shape comes
// first here, unlike a step, because drawing a cylinder is the author saying
// "this is a data store" outright — while a keyword in the label is a guess
// that can land on the wrong word. "Customer Database" reads as a person if the
// label is asked first, and as a store if the shape is.
export function attachmentIconFor(node) {
  for (const cls of node?.classes ?? []) {
    if (cls.startsWith('icon-')) {
      const name = cls.slice(5);
      if (name in ICONS) return name;
    }
  }
  return SHAPE_FALLBACK[node?.shape] ?? iconFor(node) ?? 'document';
}
