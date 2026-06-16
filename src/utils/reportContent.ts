// Reports are capped to keep them readable; the count is shown live in the editor.
export const WORD_LIMIT = 3500;

export const countWords = (text: string): number => {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

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

// The PR/issue links are stored as the first line of the report content (a
// comma-separated list) so they round-trip through the existing `content`-only
// API. These helpers keep that encoding in one place.
const LINK_LINE_RE = /^PR\/Issue:[ \t]*(.+?)[ \t]*(?:\r?\n)+/;

export const parseReportContent = (raw: string): { links: string[]; body: string } => {
  const match = raw.match(LINK_LINE_RE);
  if (match) {
    const links = match[1].split(',').map((s) => s.trim()).filter(Boolean);
    return { links: links.length ? links : [''], body: raw.slice(match[0].length) };
  }
  return { links: [''], body: raw };
};

export const composeReportContent = (links: string[], body: string): string => {
  // Drop blanks and any repeated link (case/trailing-slash insensitive),
  // keeping the first occurrence's original form.
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
  return `PR/Issue: ${cleaned.join(', ')}\n\n${body}`;
};
