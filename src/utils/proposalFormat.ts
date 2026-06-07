export type ProposalFields = {
  title: string;
  problemStatement: string;
  plan: string;
  github: string;
  links: string[];
};

export const EMPTY_PROPOSAL_FIELDS: ProposalFields = {
  title: '',
  problemStatement: '',
  plan: '',
  github: '',
  links: [''],
};

const SECTION_HEADINGS = {
  problem: '## Problem Statement',
  plan: '## 6-Month Plan & Milestones',
  links: '## Links',
};

export const serializeProposal = (f: ProposalFields): string => {
  const parts: string[] = [];
  if (f.title.trim()) parts.push(`# ${f.title.trim()}`);
  parts.push(`${SECTION_HEADINGS.problem}\n\n${f.problemStatement.trim()}`);
  parts.push(`${SECTION_HEADINGS.plan}\n\n${f.plan.trim()}`);
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
      `${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    );
  const problemMatch = text.match(sectionRegex(SECTION_HEADINGS.problem));
  const planMatch = text.match(sectionRegex(SECTION_HEADINGS.plan));
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
    githubMatch ||
    portfolioMatch ||
    collectedLinks.length > 0;
  if (!recognized) {
    return { ...EMPTY_PROPOSAL_FIELDS, problemStatement: text, links: [''] };
  }
  return {
    title: titleMatch?.[1]?.trim() ?? '',
    problemStatement: problemMatch?.[1]?.trim() ?? '',
    plan: planMatch?.[1]?.trim() ?? '',
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
