import { STYLE_KEYS, DENSITY_KEYS, DIRECTION_KEYS, LOOP_KEYS, LAYOUT_KEYS, COLOR_BY_KEYS, DEFAULTS } from './constants.js';
import { PALETTES } from './palettes.js';
import { ICON_NAMES } from './icons.js';

// The prompt is generated from the same constants the renderer uses, so a new
// style or palette cannot leave the instructions quietly out of date.
export function buildAuthoringPrompt() {
  const list = (values) => values.join(' | ');

  return `You are helping me author a FlowMaker document.

A FlowMaker document is ONE markdown file that renders as an interactive flow
diagram: each step becomes a node, hovering a step shows a short tooltip, and
clicking it opens a detail card.

## First, interview me

Do not write the file yet. Ask me about the following, a few questions at a
time, and push back when an answer is vague. If I clearly do not know
something, say so in the file rather than inventing it.

Ask first whether this is a **process** (work moving through steps) or an
**org chart** (who reports to whom). They are different documents: a process
uses questions 1-8, an org chart uses the questions under "Org charts". If I
describe a process that happens to have owners, it is still a process.

1. What process is this, and who reads the diagram? A trade-show screen, a
   team reference, and an onboarding doc want different levels of detail.
2. Where does the flow start, and what are its end states? Most real processes
   have more than one ending: approved, rejected, abandoned.
3. What are the steps, in order, using the names people actually say out loud?
4. Where are the decisions, and what does each branch mean? Give me the exact
   branch labels, for example "Approved" and "Declined".
5. What sends work backwards? Rework, review rejection, a retry, an escalation.
   For each, tell me which step it returns to. These matter: they are usually
   where a process actually loses time, and the diagram draws them distinctly.
6. Are there phases or lanes that group the steps? For example Design,
   Delivery, Operations. These become labelled containers.
7. For each step: a one-sentence summary, who owns it, how long it should take
   or its target, what it produces, and what happens when it fails.
8. What is deliberately out of scope, so the diagram does not sprawl?

## Then write the file

Produce a single markdown file in exactly this shape:

\`\`\`markdown
---
title: Order Processing
subtitle: From cart confirmation to delivered shipment
style: ${DEFAULTS.style}
palette: ${DEFAULTS.palette}
direction: ${DEFAULTS.direction}
density: ${DEFAULTS.density}
loops: ${DEFAULTS.loops}
layout: ${DEFAULTS.layout}
colorBy: ${DEFAULTS.colorBy}
---

\`\`\`\`mermaid
flowchart LR
  START([Order Placed]) --> VALIDATE[Validate Order]
  VALIDATE --> AUTH{Payment Authorized?}
  AUTH -->|Declined| RETRY[Request New Payment Method]
  RETRY --> AUTH
  AUTH -->|Approved| SHIP[Hand to Carrier]
  SHIP --> DONE([Delivered])
\`\`\`\`

## START — Order Placed

> The customer has confirmed the cart, shipping address, and payment method.

The storefront writes an immutable order record. Everything downstream reads
from that record rather than from the session, so a customer closing the
browser never loses an order.

**Owner:** Storefront team · **Target:** under 2 seconds at p95
\`\`\`

(The mermaid block above is shown with four backticks so it nests in this
prompt. In the real file it is a normal three-backtick \`mermaid\` block.)

## The rules, which are enforced

- **Frontmatter** is optional but write all of it. Values must be:
  - \`style\`: ${list(STYLE_KEYS)}
  - \`palette\`: ${list(PALETTES.map((p) => p.key))}
  - \`direction\`: ${list(DIRECTION_KEYS)} — \`LR\` reads best for a long process
  - \`density\`: ${list(DENSITY_KEYS)} — \`marquee\` is for a screen read at a distance
  - \`loops\`: ${list(LOOP_KEYS)} — \`auto\` draws a short loop as a line and a long
    one as a pair of lettered connectors
  - \`layout\`: ${list(LAYOUT_KEYS)} — \`flow\` for a process, \`tree\` for a
    reporting hierarchy. See "Org charts" below
  - \`colorBy\`: ${list(COLOR_BY_KEYS)} — see "Colour" below
- **Exactly one** fenced \`mermaid\` block, containing a \`flowchart\`. Keep it
  plain and valid so the same file still renders on GitHub and in VS Code. Put
  no FlowMaker-specific syntax inside it.
- **One \`## <NodeID> — <Title>\` section per node**, and no section whose ID is
  not a node. Node IDs are exact and case-sensitive. Use readable IDs like
  \`VALIDATE\`, not \`A\`, so the file stays editable by hand.
- **The first blockquote in a section is the tooltip.** Keep it to one sentence,
  roughly 20 to 160 characters: it appears on hover and has to be readable at a
  glance.
- **Everything after the blockquote is the detail card.** Write for a
  practitioner, not a brochure. Lists, tables, and short code samples all
  render. An owner line and a target or failure-mode line are worth including.
- Node shapes carry meaning: \`([Stadium])\` for start and end states,
  \`{Diamond}\` for decisions, \`[Rectangle]\` for steps, \`[(Cylinder)]\` for data
  stores.
- Group steps into phases with \`subgraph <id> [Label] ... end\`.

## Org charts

Set \`layout: tree\` and \`direction: TD\` and the diagram becomes a reporting
hierarchy: each box hangs beneath the one it reports to, tiers line up, and
lines run through a shared bus rather than wandering.

The one hard rule: **every box has exactly one box above it.** A box reporting
to two people, a dotted second line, or any cycle is not a hierarchy — the tool
will say which box broke it and fall back to the process layout. Put a matrix
relationship in the box's detail card as prose instead of drawing it.

Interview me for these instead of the process questions:

1. Who is at the top, and is there more than one top-level box?
2. For each person or group: who do they report to, and who reports to them?
3. What does each group own — the thing it is accountable for, not its job title.
4. Is a box a person, a team, or a function? Say which, and stay consistent.
5. How many levels deep should this go? Stopping a level early usually reads better.
6. Anything deliberately left out: matrix lines, vacancies, contractors.

Use \`<br/>\` to put a name over a role, and keep IDs meaningful:

\`\`\`\`mermaid
flowchart TD
  CEO["Dana Reyes<br/>Chief Executive"] --> CTO["Sam Okafor<br/>Chief Technology Officer"]
  CEO --> COO["Priya Raman<br/>Chief Operating Officer"]
  CTO --> PLATFORM["Alex Chen<br/>Platform Engineering"]
\`\`\`\`

Every box still gets its own \`## <ID> — <Name>, <Role>\` section, with the
blockquote as the hover summary. Good detail-card content for a box is what it
owns, its span of control, its escalation path, and what it is measured on —
not a biography. Plain \`[Rectangle]\` boxes throughout; a hierarchy has no
decisions or terminal states. \`colorBy: level\` gives each tier its own colour,
which is usually what an org chart wants.

## Colour

A palette is four swatches. \`colorBy\` decides which nodes wear which:

- \`type\` (the default) — steps, decisions, and start/end states each get their
  own colour. Best for a process.
- \`level\` — each rank or tier gets its own colour, cycling every four. Best for
  an org chart, and good for a staged process.
- \`group\` — each \`subgraph\` lane gets its own colour. Best when the phases
  matter more than the step types.
- \`tag\` — each category I name gets its own colour. Tag a node by appending
  \`:::<tag>\` to it, using whatever vocabulary fits: \`:::vp\`, \`:::employee\`,
  \`:::contractor\`, or \`:::manual\`, \`:::automated\`. Every node carrying the
  same tag gets the same colour, in the order the tags first appear. Keep it to
  four categories, since a palette has four colours, and ask me what the
  categories are rather than inventing them. A node with no tag is drawn in a
  muted grey instead of a palette colour, which is useful on purpose: tag the
  boxes the categories apply to and leave the structural ones untagged, and the
  categories carry the colour while the scaffolding recedes.

To pin one node, append \`:::c1\`, \`:::c2\`, \`:::c3\`, or \`:::c4\` to it, as in
\`ESCALATE[Escalate to On-Call]:::c4\`. An explicit swatch beats every mode, so
use it sparingly — for the one box that has to stand out, rather than as a way
to hand-colour a whole diagram; that is what \`tag\` is for. \`c4\` is the alert
colour and is otherwise unused by nodes, which makes it the right choice for a
failure or escalation path.

## Icons

The \`infographic\` style puts an icon on each step. It picks one from the step's
label automatically ("Capture Payment" resolves money, "Review Contract"
resolves document), falling back to the node's shape. To force one, append
\`:::icon-<name>\` to the node, as in \`PAY:::icon-money\`. Available names:
${ICON_NAMES.join(', ')}.

## Finally

Return the complete file in one code block, ready to save as \`<name>.md\`. Then
list anything you were unsure about and had to guess, so I can correct it.`;
}

export const AUTHORING_PROMPT = buildAuthoringPrompt();
