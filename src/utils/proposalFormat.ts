export type ProposalFields = {
  title: string;
  problemStatement: string;
  plan: string;
  mentorName: string;
  mentorContact: string;
  mentorTestimonial: string;
  github: string;
  links: string[];
};

export const EMPTY_PROPOSAL_FIELDS: ProposalFields = {
  title: '',
  problemStatement: '',
  plan: '',
  mentorName: '',
  mentorContact: '',
  mentorTestimonial: '',
  github: '',
  links: [''],
};

const SECTION_HEADINGS = {
  problem: '## Problem Statement',
  plan: '## 6-Month Plan & Milestones',
  mentor: '## Mentor',
  testimonial: '## Mentor Testimonial',
  links: '## Links',
};

export const serializeProposal = (f: ProposalFields): string => {
  const parts: string[] = [];
  if (f.title.trim()) parts.push(`# ${f.title.trim()}`);
  parts.push(`${SECTION_HEADINGS.problem}\n\n${f.problemStatement.trim()}`);
  parts.push(`${SECTION_HEADINGS.plan}\n\n${f.plan.trim()}`);
  const mentorLines: string[] = [];
  if (f.mentorName.trim()) mentorLines.push(`- Name: ${f.mentorName.trim()}`);
  if (f.mentorContact.trim()) mentorLines.push(`- Contact: ${f.mentorContact.trim()}`);
  if (mentorLines.length) parts.push(`${SECTION_HEADINGS.mentor}\n\n${mentorLines.join('\n')}`);
  if (f.mentorTestimonial.trim())
    parts.push(`${SECTION_HEADINGS.testimonial}\n\n${f.mentorTestimonial.trim()}`);
  const lines: string[] = [];
  // Store the canonical bare username, whatever form the user typed it in.
  const github = normalizeGithub(f.github);
  if (github) lines.push(`- GitHub: ${github}`);
  for (const link of f.links) {
    const v = link.trim();
    if (v) lines.push(`- ${v}`);
  }
  if (lines.length) parts.push(`${SECTION_HEADINGS.links}\n\n${lines.join('\n')}`);
  return parts.join('\n\n');
};

export const parseProposal = (text: string): ProposalFields => {
  if (!text.trim()) return { ...EMPTY_PROPOSAL_FIELDS, links: [''] };
  const titleMatch = text.match(/^#\s+(.+?)\s*$/m);
  const sectionRegex = (heading: string) =>
    new RegExp(
      `${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:\\n|$)([\\s\\S]*?)(?=\\n##\\s|$)`,
    );
  const problemMatch = text.match(sectionRegex(SECTION_HEADINGS.problem));
  const planMatch = text.match(sectionRegex(SECTION_HEADINGS.plan));
  // Mentor name/contact are bullets scoped to their own section so they can't
  // collide with similarly-labelled bullets elsewhere in the proposal.
  const mentorSection = text.match(sectionRegex(SECTION_HEADINGS.mentor));
  const mentorName = mentorSection?.[1]?.match(/^-\s*Name:\s*(.+?)\s*$/m)?.[1] ?? '';
  const mentorContact = mentorSection?.[1]?.match(/^-\s*Contact:\s*(.+?)\s*$/m)?.[1] ?? '';
  const testimonialMatch = text.match(sectionRegex(SECTION_HEADINGS.testimonial));
  const githubMatch = text.match(/^-\s*GitHub:\s*(.+?)\s*$/m);
  // Legacy single Portfolio bullet — fold into links array.
  const portfolioMatch = text.match(/^-\s*Portfolio:\s*(.+?)\s*$/m);
  // Generic bullets that are URLs (not GitHub / Portfolio labelled).
  const linksSection = text.match(sectionRegex(SECTION_HEADINGS.links));
  const collectedLinks: string[] = [];
  if (linksSection?.[1]) {
    const lineRe = /^-\s*(.+?)\s*$/gm;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(linksSection[1])) != null) {
      const raw = m[1].trim();
      if (/^GitHub:/i.test(raw)) continue;
      if (/^Portfolio:/i.test(raw)) {
        collectedLinks.push(raw.replace(/^Portfolio:\s*/i, ''));
        continue;
      }
      collectedLinks.push(raw);
    }
  } else if (portfolioMatch) {
    collectedLinks.push(portfolioMatch[1].trim());
  }

  const recognized =
    titleMatch ||
    problemMatch ||
    planMatch ||
    mentorSection ||
    testimonialMatch ||
    githubMatch ||
    portfolioMatch ||
    collectedLinks.length > 0;
  if (!recognized) {
    const planOnlyMatch = text.match(sectionRegex(SECTION_HEADINGS.plan));
    return {
      ...EMPTY_PROPOSAL_FIELDS,
      problemStatement: text.replace(sectionRegex(SECTION_HEADINGS.plan), '').trim(),
      plan: planOnlyMatch?.[1]?.trim() ?? '',
      links: [''],
    };
  }
  const problemStatement = (problemMatch?.[1] ?? '')
    .replace(sectionRegex(SECTION_HEADINGS.plan), '')
    .trim();
  return {
    title: titleMatch?.[1]?.trim() ?? '',
    problemStatement,
    plan: planMatch?.[1]?.trim() ?? '',
    mentorName,
    mentorContact,
    mentorTestimonial: testimonialMatch?.[1]?.trim() ?? '',
    github: githubMatch?.[1]?.trim() ?? '',
    links: collectedLinks.length > 0 ? collectedLinks : [''],
  };
};

// =========================
// Validation
// =========================

const GITHUB_URL_RE = /^https?:\/\/(www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]){0,38})\/?$/i;
const GITHUB_HANDLE_RE = /^@?[A-Za-z0-9](?:[A-Za-z0-9-]){0,38}$/;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;

export const validateGithub = (value: string): string | null => {
  const v = value.trim();
  if (!v) return null;
  if (GITHUB_URL_RE.test(v)) return null;
  if (GITHUB_HANDLE_RE.test(v)) return null;
  return 'Enter a GitHub username (e.g. aarav-m) or profile URL (https://github.com/aarav-m).';
};

/**
 * Canonicalize any accepted GitHub input (`@handle`, `handle`, profile URL)
 * to the bare username. Invalid input is returned trimmed but untouched so
 * the validation error stays visible on what the user actually typed.
 */
export const normalizeGithub = (value: string): string => {
  const v = value.trim();
  if (!v) return '';
  const urlMatch = v.match(GITHUB_URL_RE);
  if (urlMatch) return urlMatch[2];
  if (GITHUB_HANDLE_RE.test(v)) return v.replace(/^@/, '');
  return v;
};

export const githubProfileUrl = (value: string): string => {
  const handle = normalizeGithub(value);
  return handle.startsWith('http') ? handle : `https://github.com/${handle}`;
};

export const validateLink = (value: string): string | null => {
  const v = value.trim();
  if (!v) return null;
  if (URL_RE.test(v)) return null;
  return 'Enter a full URL starting with http:// or https://';
};

// Compare links ignoring protocol, www, case, and trailing slashes so
// "https://Foo.com/x/" and "http://foo.com/x" count as the same link.
const normalizeUrlForCompare = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');

/** Indices of links that duplicate an earlier entry (empty entries ignored). */
export const duplicateLinkIndices = (links: string[]): Set<number> => {
  const seen = new Set<string>();
  const dups = new Set<number>();
  links.forEach((link, i) => {
    const key = normalizeUrlForCompare(link);
    if (!key) return;
    if (seen.has(key)) dups.add(i);
    else seen.add(key);
  });
  return dups;
};
