// Reports are capped to keep them readable; the count is shown live in the editor.
// The cap is a character count (not words) and applies to the summary and to each
// reflective answer independently.
export const CHAR_LIMIT = 3500;

export const countChars = (text: string): number => text.length;

// A valid pull-request or issue link, e.g.
// https://github.com/owner/repo/pull/123 or .../issues/123
const GITHUB_LINK_RE =
  /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:pull|issues)\/\d+(?:[#/?].*)?$/i;

export const isValidGithubLink = (url: string): boolean => GITHUB_LINK_RE.test(url.trim());

// Normalize a link for duplicate detection: trim, drop any trailing slash, and
// lowercase (GitHub treats the host and owner/repo case-insensitively), so two
// inputs pointing at the same PR/issue collide regardless of casing.
const normalizeLink = (url: string): string => url.trim().replace(/\/+$/, '').toLowerCase();

// Indices of links that repeat an earlier (non-empty) link. The first
// occurrence is kept; every later duplicate is flagged.
export const findDuplicateLinkIndices = (links: string[]): Set<number> => {
  const seen = new Set<string>();
  const dupes = new Set<number>();
  links.forEach((link, i) => {
    const key = normalizeLink(link);
    if (!key) return;
    if (seen.has(key)) dupes.add(i);
    else seen.add(key);
  });
  return dupes;
};

// Prepare the editor's link inputs for the API: drop blanks and any repeated link
// (case/trailing-slash insensitive), keeping the first occurrence's original form.
export const cleanLinks = (links: string[]): string[] => {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of links) {
    const link = raw.trim();
    if (!link) continue;
    const key = normalizeLink(link);
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(link);
  }
  return cleaned;
};

// The four optional reflective questions, in display order. The `field` matches
// the API body/content key; the `prompt` is the exact copy shown to the fellow.
// Single source of truth for the editor inputs and the read-only views.
export type ReflectiveField =
  | 'challengingWork'
  | 'keyLearning'
  | 'reviewerFeedback'
  | 'growthGoal';

export const REFLECTIVE_QUESTIONS: { field: ReflectiveField; prompt: string }[] = [
  {
    field: 'challengingWork',
    prompt:
      'Pick the single most challenging or interesting piece of work you did this month. Walk us through it: What was the problem? What approach did you first try, and what did you end up doing instead?',
  },
  {
    field: 'keyLearning',
    prompt:
      "What's something you understand now that you didn't at the start of the month? (A tool, a part of the codebase, a concept, a way of working—anything.)",
  },
  {
    field: 'reviewerFeedback',
    prompt: 'Describe one piece of feedback you got from a maintainer or reviewer.',
  },
  {
    field: 'growthGoal',
    prompt: 'What do you want to get better at next month?',
  },
];
