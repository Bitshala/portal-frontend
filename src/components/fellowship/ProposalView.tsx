import { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ExternalLink, Github } from 'lucide-react';
import ExpandableText from './ExpandableText';
import LinkChip from './LinkChip';
import {
  githubProfileUrl,
  normalizeGithub,
  parseProposal,
} from '../../utils/proposalFormat';

export const ProposalSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <Box sx={{ mt: 2.5 }}>
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        letterSpacing: 1,
        fontSize: '0.68rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        display: 'block',
        mb: 1,
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

const LongText = ({ text, expandable }: { text: string; expandable: boolean }) =>
  expandable && text ? (
    <ExpandableText text={text} maxLines={10} />
  ) : (
    <Typography
      variant="body2"
      sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
    >
      {text || '—'}
    </Typography>
  );

/**
 * Shared read view of a proposal's sections (problem statement, plan, links).
 * Used by the reviewer detail pane, the fellowships manage screen dialog and
 * the print/export view, so the proposal renders the same everywhere.
 */
export const ProposalView = ({
  proposal,
  expandable = false,
}: {
  proposal: string;
  /** Clamp long sections behind a "Show more" toggle (for compact contexts). */
  expandable?: boolean;
}) => {
  const fields = useMemo(() => parseProposal(proposal), [proposal]);
  const links = fields.links.map((l) => l.trim()).filter(Boolean);

  return (
    <>
      <ProposalSection title="Problem statement">
        <LongText text={fields.problemStatement} expandable={expandable} />
      </ProposalSection>

      <ProposalSection title="6-month plan">
        <LongText text={fields.plan} expandable={expandable} />
      </ProposalSection>

      {(fields.mentorName || fields.mentorContact) && (
        <ProposalSection title="Mentor">
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            {fields.mentorName || '—'}
            {fields.mentorContact && (
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {' '}
                · {fields.mentorContact}
              </Box>
            )}
          </Typography>
          {fields.mentorTestimonial && (
            <Box sx={{ mt: 1 }}>
              <LongText text={fields.mentorTestimonial} expandable={expandable} />
            </Box>
          )}
        </ProposalSection>
      )}

      {(fields.github || links.length > 0) && (
        <ProposalSection title="Links">
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ rowGap: 1 }}>
            {fields.github && (
              <LinkChip
                href={githubProfileUrl(fields.github)}
                icon={<Github size={13} />}
                label={`@${normalizeGithub(fields.github)}`}
              />
            )}
            {links.map((l) => (
              <LinkChip
                key={l}
                href={l.startsWith('http') ? l : `https://${l}`}
                icon={<ExternalLink size={13} />}
                label={l.replace(/^https?:\/\//, '')}
              />
            ))}
          </Stack>
        </ProposalSection>
      )}
    </>
  );
};

export default ProposalView;
