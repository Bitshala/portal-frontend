import type {
  FellowshipApplicationProposalDto,
  FellowshipApplicationProposalWriteDto,
} from '../types/fellowship';

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

// Map the structured proposal from the API into react-hook-form state:
// null becomes '' and an empty links list keeps one blank row for the UI.
export const proposalDtoToFields = (
  dto: FellowshipApplicationProposalDto | null | undefined,
): ProposalFields => {
  if (!dto) return { ...EMPTY_PROPOSAL_FIELDS, links: [''] };
  return {
    title: dto.title ?? '',
    problemStatement: dto.problemStatement ?? '',
    plan: dto.plan ?? '',
    mentorName: dto.mentorName ?? '',
    mentorContact: dto.mentorContact ?? '',
    mentorTestimonial: dto.mentorTestimonial ?? '',
    github: dto.github ?? '',
    links: dto.links.length > 0 ? dto.links : [''],
  };
};

// Build the create/update request body from form state. Everything is trimmed,
// the GitHub handle is canonicalized to a bare username, and empty link rows are
// dropped. Empty strings are sent verbatim so clearing a field persists.
export const buildProposalBody = (
  f: ProposalFields,
): FellowshipApplicationProposalWriteDto => ({
  title: f.title.trim(),
  problemStatement: f.problemStatement.trim(),
  plan: f.plan.trim(),
  mentorName: f.mentorName.trim(),
  mentorContact: f.mentorContact.trim(),
  mentorTestimonial: f.mentorTestimonial.trim(),
  github: normalizeGithub(f.github),
  links: f.links.map((l) => l.trim()).filter(Boolean),
});

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
