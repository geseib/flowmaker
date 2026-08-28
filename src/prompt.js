import {
  STYLE_KEYS, DENSITY_KEYS, DIRECTION_KEYS, LOOP_KEYS, LAYOUT_KEYS,
  COLOR_BY_KEYS, ICON_MODE_KEYS, DEFAULTS,
} from './constants.js';
import { PALETTES } from './palettes.js';
import { ICON_GUIDE } from './icons.js';

// The prompt is generated from the same constants the renderer uses, so a new
// style, palette, or icon cannot leave the instructions quietly out of date.
// It assumes the reader has never heard of this tool: it is pasted into a fresh
// conversation with no other context.
export function buildAuthoringPrompt() {
  const list = (values) => values.map((v) => `\`${v}\``).join(' | ');
  const palettes = PALETTES.map((p) => `\`${p.key}\``).join(' | ');

  return `# Write me a FlowMaker diagram

You are writing **one markdown file**. A tool called FlowMaker turns that file
into an interactive diagram: every step becomes a box, hovering a box shows a
one-line summary, and clicking it opens a detail card. The same file also
renders as ordinary markdown on GitHub, so it has to stay valid markdown with a
plain mermaid code block inside it.

You do not need to know anything else about the tool. Everything it accepts is
described below. Nothing outside this file is needed: no images, no links, no
libraries.

It makes two kinds of diagram:

- **A flow** — a process: work moving through steps, decisions, and loops back.
- **An org chart** — a hierarchy: who reports to whom. Set \`layout: tree\`.

The diagrams get read on big screens at trade-show booths and on phones, so
favour short, concrete box labels and put the detail in the sections rather
than in the boxes.

## First, interview me

**Do not write the file yet.** Ask me questions a few at a time, and push back
when an answer is vague. If I do not know something, say so in the file rather
than inventing it.

Start by asking whether this is a **process** or an **org chart**, because the
questions differ. If I describe a process that happens to have owners, it is
still a process.

**For a process:**

1. What process is this, and who reads the diagram? A booth screen, a team
   reference, and an onboarding doc want different levels of detail.
2. Where does it start, and what are its end states? Most real processes have
   more than one ending: approved, rejected, abandoned.
3. What are the steps, in order, using the names people actually say out loud?
4. Where are the decisions, and what does each branch mean? Give me the exact
   branch labels, for example "Approved" and "Declined".
5. What sends work backwards? Rework, a rejected review, a retry, an
   escalation. For each, which step does it return to? These matter: they are
   usually where a process actually loses time, and the diagram draws them
   distinctly.
6. Are there phases or lanes that group the steps — Design, Delivery,
   Operations? They become labelled containers, and they can nest.
7. Does anything get handed from one step to the next — a document, a payment,
   a signed contract, a package? Those get drawn on the arrow.
8. Which steps does a person do, and which does a system or an automated agent
   do? Do not guess at this; it is usually the most interesting thing on the
   diagram.
9. For each step: a one-sentence summary, who owns it, its target or how long
   it should take, what it produces, and what happens when it fails.
10. What is deliberately out of scope, so the diagram does not sprawl?

**For an org chart**, ask the questions under "Org charts" below instead.

Then, before writing: read back the shape you have understood — the steps in
order, the decisions, and the loops — in a few lines, and let me correct it.

## Then write the file

Return one complete markdown file, ready to save as \`<name>.md\`. It has three
parts, in this order: frontmatter, one mermaid block, then one section per box.

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
icons: ${DEFAULTS.icons}
---

\`\`\`\`mermaid
flowchart LR
  START([Order Placed]) --> VALIDATE[Validate Order]
  VALIDATE --> AUTH{Payment Authorized?}
  AUTH -->|Declined| RETRY[Request New Payment Method]
  RETRY --> AUTH
  AUTH -->|money: Payment Taken| PACK[Pick and Pack]
  PACK --> DONE([Delivered])
\`\`\`\`

## START — Order Placed

> The customer has confirmed the cart, shipping address, and payment method.

The storefront writes an immutable order record. Everything downstream reads
from that record rather than from the session, so a customer closing the
browser never loses an order.

**Owner:** Storefront · **Target:** under 2 seconds at p95
\`\`\`

(The mermaid block above is shown with four backticks so that it nests inside
this prompt. In the real file it is a normal three-backtick \`mermaid\` block.)

## The three parts

### 1. Frontmatter

Optional, but write all of it. Every value must be one of these:

- \`title\` — the diagram's name. Also names the file when it is saved.
- \`subtitle\` — one line saying what it covers.
- \`style\` — ${list(STYLE_KEYS)}
  - \`executive-clean\` is the safe default for a document.
  - \`bold-brutal\` and \`neon-circuit\` are for a screen read from a distance.
  - \`infographic\` puts an icon on every step.
  - \`accent-rail\` is quiet cards with a coloured bar down one edge.
  - \`blueprint\` is a technical drawing; \`soft-depth\` is soft cards.
- \`palette\` — ${palettes}
- \`direction\` — ${list(DIRECTION_KEYS)}. \`LR\` reads best for a long process;
  \`TD\` for an org chart.
- \`density\` — ${list(DENSITY_KEYS)}. \`marquee\` sets large type for a screen
  read at a distance; \`compact\` fits more on a page.
- \`loops\` — ${list(LOOP_KEYS)}. How a step that goes back to an earlier one is
  drawn: \`auto\` gives a short loop a line and a long one a pair of lettered
  connectors, the way an off-page connector works on a flowchart.
- \`layout\` — ${list(LAYOUT_KEYS)}. \`flow\` for a process, \`tree\` for a
  hierarchy. See "Org charts".
- \`colorBy\` — ${list(COLOR_BY_KEYS)}. See "Colour".
- \`icons\` — ${list(ICON_MODE_KEYS)}. \`auto\` shows icons only with the
  \`infographic\` style; \`on\` shows them whatever the style.

### 2. The mermaid block

**Exactly one** fenced block tagged \`mermaid\`, containing a \`flowchart\`. Keep
it plain and valid so the file still renders on GitHub and in VS Code.

Use readable ids — \`VALIDATE\`, not \`A\` — so the file stays editable by hand.

**Shapes carry meaning.** Use them:

- \`([Stadium])\` — a start or an end state
- \`[Rectangle]\` — an ordinary step
- \`{Diamond}\` — a decision
- \`[(Cylinder)]\` — a data store
- \`[[Subroutine]]\` — a process defined elsewhere

**Arrows:**

- \`A --> B\` — a plain step
- \`A -->|Approved| B\` — a branch, labelled with what makes it happen
- \`A -.-> B\` — a dotted, weaker relationship
- \`A ==> B\` — a thicker, primary path

**An arrow can carry something.** Put an icon name before the label and the
arrow shows the artifact being handed over, drawn clear of the line:

    BCASE -->|doc: Product Request| DRAFT
    CHECKOUT -->|money: Payment Taken| SHIP
    REVIEW -->|retry: Changes Requested| DRAFT

Use it for a real artifact — a document, a payment, a package, a signed
contract. A plain branch label like "Approved" or "Rejected" stays a plain
label.

**Group steps into phases** with \`subgraph <id> [Label] ... end\`. Groups can
nest, and the outer box is drawn around the inner one:

    subgraph arch [Architecture and Governance]
      subgraph design [Draft Technical Design]
        DRAFT[Agent Drafts It] --> CRITIQUE[Architect Reviews It]
        CRITIQUE -->|retry: Changes| DRAFT
      end
      CRITIQUE --> VERDICT{Approved?}
    end

### 3. One section per box

Write **one \`## <NodeID> — <Title>\` section per node**, and no section whose id
is not a node. Node ids are exact and **case-sensitive**.

- **The first blockquote in a section is the hover summary.** One sentence,
  roughly 20 to 160 characters: it has to be readable at a glance.
- **Everything after the blockquote is the detail card.** Write for a
  practitioner, not a brochure. Lists, tables, and short code samples all
  render. An owner line and a target or failure-mode line are worth including.

## Icons

An icon can go on a step, and on an arrow that hands something over. Set
\`icons: on\` to show them whatever the style.

- **On a step:** append \`:::icon-<name>\`, as in \`PAY[Capture Payment]:::icon-money\`.
  An untagged step gets an icon guessed from its wording, falling back to its
  shape — so tag the ones a guess would get wrong.
- **On an arrow:** put the name before the label, as in \`-->|doc: Spec|\`.
- **Who does the work:** \`:::icon-human\` and \`:::icon-agent\` separate a step a
  person does from one an automated agent does. If both appear in a flow, tag
  every step one way or the other — half-tagged reads as an oversight.

Choose from this list. An unknown name is ignored, so do not invent one:

${Object.entries(ICON_GUIDE).map(([name, use]) => `- \`${name}\` — ${use}`).join('\n')}

## Org charts

Set \`layout: tree\` and \`direction: TD\` and the diagram becomes a reporting
hierarchy: each box hangs beneath the one it reports to, tiers line up, and the
lines run through a shared bus rather than wandering.

The one hard rule: **every box has exactly one box above it.** A box reporting
to two people, a dotted second line, or any cycle is not a hierarchy — the tool
will say which box broke it and fall back to the flow layout. Put a matrix
relationship in that box's detail card as prose instead of drawing it.

Ask me these instead of the process questions:

1. Who is at the top, and is there more than one top-level box?
2. For each person or group: who do they report to, and who reports to them?
3. What does each group own — what it is accountable for, not its job title.
4. Is a box a person, a team, or a function? Say which, and stay consistent.
5. How many levels deep should this go? Stopping a level early usually reads better.
6. Anything deliberately left out: matrix lines, vacancies, contractors.

Use \`<br/>\` to put a name over a role:

    flowchart TD
      CEO["Dana Reyes<br/>Chief Executive"] --> CTO["Sam Okafor<br/>Chief Technology Officer"]
      CEO --> COO["Priya Raman<br/>Chief Operating Officer"]

Every box still gets its own \`## <ID> — <Name>, <Role>\` section. Good detail
for a box is what it owns, its span of control, its escalation path, and what
it is measured on — not a biography. Use plain \`[Rectangle]\` boxes throughout:
a hierarchy has no decisions or terminal states.

## Colour

A palette is four colours. \`colorBy\` decides which boxes wear which:

- \`type\` — steps, decisions, and start/end states each get their own colour.
  Best for a process. This is the default.
- \`level\` — each rank or tier gets its own colour. Best for an org chart, and
  good for a staged process.
- \`group\` — each \`subgraph\` lane gets its own colour. Best when the phases
  matter more than the step types.
- \`tag\` — each category you name gets its own colour. Tag a box by appending
  \`:::<tag>\`, using whatever vocabulary fits: \`:::vp\`, \`:::employee\`,
  \`:::contractor\`, or \`:::manual\`, \`:::automated\`. Every box with the same tag
  gets the same colour. Keep it to four categories, since a palette has four
  colours, and ask me what the categories are rather than inventing them. A box
  with no tag is drawn muted rather than taking a category's colour — which is
  useful: tag what the categories apply to, leave the scaffolding untagged, and
  the categories carry the colour while the structure recedes.

To pin one box, append \`:::c1\`, \`:::c2\`, \`:::c3\`, or \`:::c4\`. An explicit
colour beats every mode, so use it for the single box that has to stand out
rather than to hand-colour a diagram — that is what \`tag\` is for. \`c4\` is the
alert colour and is otherwise unused, which makes it right for a failure path.

## What the tool rejects

These are checked, and a file that breaks them will report a warning:

- More than one mermaid block, or a diagram that is not a \`flowchart\`.
- A \`##\` section whose id matches no node, or a node with no section.
- A frontmatter value that is not in the lists above.
- For \`layout: tree\`, a box with two parents or a cycle.

## Finally

Return the complete file in one code block. Then list, briefly, anything you
were unsure about and had to guess, so I can correct it rather than discover it
later in the diagram.`;
}

export const AUTHORING_PROMPT = buildAuthoringPrompt();
