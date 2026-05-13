export type ProposalFields = {
  title: string;
  problemStatement: string;
  plan: string;
  github: string;
  portfolio: string;
};

export const EMPTY_PROPOSAL_FIELDS: ProposalFields = {
  title: '',
  problemStatement: '',
  plan: '',
  github: '',
  portfolio: '',
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
  const links: string[] = [];
  if (f.github.trim()) links.push(`- GitHub: ${f.github.trim()}`);
  if (f.portfolio.trim()) links.push(`- Portfolio: ${f.portfolio.trim()}`);
  if (links.length) parts.push(`${SECTION_HEADINGS.links}\n\n${links.join('\n')}`);
  return parts.join('\n\n');
};

export const parseProposal = (text: string): ProposalFields => {
  if (!text.trim()) return EMPTY_PROPOSAL_FIELDS;
  const titleMatch = text.match(/^#\s+(.+?)\s*$/m);
  const sectionRegex = (heading: string) =>
    new RegExp(`${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`);
  const problemMatch = text.match(sectionRegex(SECTION_HEADINGS.problem));
  const planMatch = text.match(sectionRegex(SECTION_HEADINGS.plan));
  const githubMatch = text.match(/^-\s*GitHub:\s*(.+?)\s*$/m);
  const portfolioMatch = text.match(/^-\s*Portfolio:\s*(.+?)\s*$/m);

  const recognized =
    titleMatch || problemMatch || planMatch || githubMatch || portfolioMatch;
  if (!recognized) {
    return { ...EMPTY_PROPOSAL_FIELDS, problemStatement: text };
  }
  return {
    title: titleMatch?.[1]?.trim() ?? '',
    problemStatement: problemMatch?.[1]?.trim() ?? '',
    plan: planMatch?.[1]?.trim() ?? '',
    github: githubMatch?.[1]?.trim() ?? '',
    portfolio: portfolioMatch?.[1]?.trim() ?? '',
  };
};
