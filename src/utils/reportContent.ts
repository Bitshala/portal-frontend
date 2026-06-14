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
  const cleaned = links.map((l) => l.trim()).filter(Boolean);
  return `PR/Issue: ${cleaned.join(', ')}\n\n${body}`;
};
