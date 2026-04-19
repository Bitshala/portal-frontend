import { FellowshipType } from '../../types/fellowship';

const DEVELOPER_TEMPLATE = `# Application for Bitshala Fellowship

**Name:**
**Email:**
**Location:**
**Timezone:**
**GitHub:**
**LinkedIn:**
**Twitter / Nostr:**

## Background & Prior Contributions

Describe your background as a Bitcoin / Lightning developer. Which projects
have you worked on, and what did you build? Call out hackathons, fellowships,
internships, or FOSS work.

**Major work / pull requests:**

- https://github.com/...
- https://github.com/...
- https://github.com/...

## Project Focus

Which open-source project(s) do you want to work on, and what specific problems
do you want to solve? Link to existing issues, discussions, or RFCs where you can.

## Rough Timeline of Deliverables

### Month 1–2
- Land X refactor / feature in the target repo
- Identify and fix high-priority bugs
- Ship N pull requests

### Month 3–4
- Research and prototype Y
- Implement and ship it behind a flag
- Begin end-to-end / integration testing

### Month 5–6
- Expand test coverage for critical flows
- Refine Y based on real usage and feedback
- Clean up remaining rough edges

### Ongoing Throughout the 6 Months
- Review pull requests and participate in discussions
- Fix bugs as they come up, improve stability
- Take ownership of assigned tasks and new features
- Refactor when needed to keep the codebase clean

## Impact of the Work

Explain the real-world impact: fewer crashes, better UX, new capabilities,
a more maintainable codebase, and what this unlocks for users and maintainers.

## Testimonial from Maintainer

_(Optional)_ Paste a short testimonial or the contact details of a maintainer
who can vouch for your work.

## Long-term Vision

Your goals beyond the 6 months — how you plan to stay involved with the project
and the wider Bitcoin / Lightning ecosystem.
`;

const DESIGNER_TEMPLATE = `# Application for Bitshala Fellowship

**Name:**
**Email:**
**Location:**
**Timezone:**
**Portfolio:**
**Dribbble / Behance:**
**GitHub:**
**LinkedIn:**
**Twitter / Nostr:**

## Background & Prior Contributions

Describe your design background — product, UX, visual, research. Call out any
Bitcoin / Lightning / FOSS work you've done and what you're known for.

**Selected work:**

- Case study / Figma link — one-line description
- Case study / Figma link — one-line description
- Case study / Figma link — one-line description

## Project Focus

Which Bitcoin-native product, docs site, wallet, or learning experience do you
want to design? What is the user problem, and who is the user?

## Rough Timeline of Deliverables

### Month 1–2 — Research & Discovery
- User interviews and competitive teardown
- Information architecture and journey maps
- Low-fidelity wireframes for key flows

### Month 3–4 — Design & Prototype
- High-fidelity mockups in Figma
- Design-system tokens (color, type, spacing, motion)
- Interactive prototype + usability testing

### Month 5–6 — Handoff & Polish
- Final spec and component library
- Pair with developers on implementation
- Iterate based on real usage and feedback

### Ongoing Throughout the 6 Months
- Design critiques and reviews with the team
- Maintain the living Figma library
- Document patterns, rationale, and accessibility notes

## Impact of the Work

How will better design improve adoption, trust, clarity, or usability for the
end user? What metrics or qualitative outcomes will you look at?

## Testimonial / References

_(Optional)_ Names and links of collaborators, maintainers, or researchers who
can vouch for your work.

## Long-term Vision

How you plan to keep designing for Bitcoin after the fellowship — open-source
design systems, mentorship, ongoing collaboration, etc.
`;

const EDUCATOR_TEMPLATE = `# Application for Bitshala Fellowship

**Name:**
**Email:**
**Location:**
**Timezone:**
**Blog / YouTube / Newsletter:**
**GitHub:**
**LinkedIn:**
**Twitter / Nostr:**

## Background & Prior Contributions

Teaching, writing, or curriculum work you've done — inside or outside Bitcoin.
Workshops, cohorts, articles, videos, open courseware all count.

**Selected work:**

- Article / video / course — one-line description
- Article / video / course — one-line description
- Article / video / course — one-line description

## Curriculum Focus

Which topic will you teach (Bitcoin protocol, Lightning, mining, self-custody,
developer onboarding, etc.)? Who is the learner, and what will they be able to
do after?

## Rough Timeline of Deliverables

### Month 1–2 — Curriculum Design
- Define learning outcomes and target audience
- Outline modules, weekly structure, and assessments
- Draft the first 2–3 lessons end-to-end

### Month 3–4 — Production
- Write remaining lessons with code samples / exercises
- Record videos or run a pilot cohort
- Gather feedback from early learners

### Month 5–6 — Delivery & Iteration
- Run the full cohort or publish the curriculum
- Review submissions and hold office hours
- Iterate on content based on learner feedback

### Ongoing Throughout the 6 Months
- Support learners in chat / forum / GitHub
- Publish weekly updates, blog posts, or threads
- Maintain the curriculum repo and keep it current

## Impact of the Work

How many learners will you reach, and what will they be able to build or
contribute after completing the curriculum?

## Testimonial / References

_(Optional)_ Educators, maintainers, or former students who can vouch for
your teaching.

## Long-term Vision

How the curriculum lives on after the fellowship — open source, translations,
future cohorts, hand-off to maintainers, etc.
`;

export const PROPOSAL_TEMPLATES: Record<FellowshipType, string> = {
  [FellowshipType.DEVELOPER]: DEVELOPER_TEMPLATE,
  [FellowshipType.DESIGNER]: DESIGNER_TEMPLATE,
  [FellowshipType.EDUCATOR]: EDUCATOR_TEMPLATE,
};

export const isTemplate = (text: string): boolean =>
  Object.values(PROPOSAL_TEMPLATES).some((t) => t.trim() === text.trim());
