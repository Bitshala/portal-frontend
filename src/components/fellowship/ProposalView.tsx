import { Box, Stack, Typography } from '@mui/material';
import { ExternalLink, Github } from 'lucide-react';
import ExpandableText from './ExpandableText';
import LinkChip from './LinkChip';
import type { FellowshipApplicationProposalDto } from '../../types/fellowship';
import { githubProfileUrl, normalizeGithub } from '../../utils/proposalFormat';

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
  proposal: FellowshipApplicationProposalDto | null | undefined;
  /** Clamp long sections behind a "Show more" toggle (for compact contexts). */
  expandable?: boolean;
}) => {
  const github = proposal?.github ?? '';
  const links = (proposal?.links ?? []).map((l) => l.trim()).filter(Boolean);

  return (
    <>
      <ProposalSection title="Problem statement">
        <LongText text={proposal?.problemStatement ?? ''} expandable={expandable} />
      </ProposalSection>

      <ProposalSection title="6-month plan">
        <LongText text={proposal?.plan ?? ''} expandable={expandable} />
      </ProposalSection>

      {(proposal?.mentorName || proposal?.mentorContact) && (
        <ProposalSection title="Mentor">
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            {proposal.mentorName || '—'}
            {proposal.mentorContact && (
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {' '}
                · {proposal.mentorContact}
              </Box>
            )}
          </Typography>
          {proposal.mentorTestimonial && (
            <Box sx={{ mt: 1 }}>
              <LongText text={proposal.mentorTestimonial} expandable={expandable} />
            </Box>
          )}
        </ProposalSection>
      )}

      {(github || links.length > 0) && (
        <ProposalSection title="Links">
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ rowGap: 1 }}>
            {github && (
              <LinkChip
                href={githubProfileUrl(github)}
                icon={<Github size={13} />}
                label={`@${normalizeGithub(github)}`}
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
