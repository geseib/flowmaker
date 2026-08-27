import { STYLE_KEYS, DENSITY_KEYS, DIRECTION_KEYS, LOOP_KEYS, LAYOUT_KEYS, DEFAULTS } from './constants.js';
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
  - \`layout\`: ${list(LAYOUT_KEYS)} — use \`tree\` only for a reporting hierarchy (an org chart), where every box has exactly one box above it; pair it with \`direction: TD\`
    one as a pair of lettered connectors
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
