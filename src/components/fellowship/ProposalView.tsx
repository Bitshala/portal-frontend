import { Box, Chip, Stack, Typography } from '@mui/material';
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
const ChipRow = ({ values }: { values: string[] }) => (
  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1 }}>
    {values.map((v) => (
      <Chip key={v} label={v} size="small" />
    ))}
  </Stack>
);

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
  const domains = proposal?.domains ?? [];
  const codingLanguages = proposal?.codingLanguages ?? [];
  const educationInterests = proposal?.educationInterests ?? [];

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

      {(proposal?.projectName || proposal?.projectGithubLink) && (
        <ProposalSection title="Project">
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            {proposal.projectName || '—'}
          </Typography>
          {proposal.projectGithubLink && (
            <Box sx={{ mt: 1 }}>
              <LinkChip
                href={proposal.projectGithubLink}
                icon={<Github size={13} />}
                label={proposal.projectGithubLink.replace(/^https?:\/\//, '')}
              />
            </Box>
          )}
        </ProposalSection>
      )}

      {proposal?.academicBackground && (
        <ProposalSection title="Academic background">
          <LongText text={proposal.academicBackground} expandable={expandable} />
        </ProposalSection>
      )}

      {proposal?.graduationYear != null && (
        <ProposalSection title="Graduation year">
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            {proposal.graduationYear}
          </Typography>
        </ProposalSection>
      )}

      {proposal?.professionalExperience && (
        <ProposalSection title="Professional experience">
          <LongText text={proposal.professionalExperience} expandable={expandable} />
        </ProposalSection>
      )}

      {domains.length > 0 && (
        <ProposalSection title="Domains">
          <ChipRow values={domains} />
        </ProposalSection>
      )}

      {codingLanguages.length > 0 && (
        <ProposalSection title="Coding languages">
          <ChipRow values={codingLanguages} />
        </ProposalSection>
      )}

      {educationInterests.length > 0 && (
        <ProposalSection title="Education interests">
          <ChipRow values={educationInterests} />
        </ProposalSection>
      )}

      {proposal?.bitcoinContributions && (
        <ProposalSection title="Bitcoin contributions">
          <LongText text={proposal.bitcoinContributions} expandable={expandable} />
        </ProposalSection>
      )}

      {proposal?.bitcoinMotivation && (
        <ProposalSection title="Bitcoin motivation">
          <LongText text={proposal.bitcoinMotivation} expandable={expandable} />
        </ProposalSection>
      )}

      {proposal?.bitcoinOssGoal && (
        <ProposalSection title="Bitcoin OSS goal">
          <LongText text={proposal.bitcoinOssGoal} expandable={expandable} />
        </ProposalSection>
      )}

      {proposal?.additionalInfo && (
        <ProposalSection title="Additional info">
          <LongText text={proposal.additionalInfo} expandable={expandable} />
        </ProposalSection>
      )}

      {proposal?.questionsForBitshala && (
        <ProposalSection title="Questions for Bitshala">
          <LongText text={proposal.questionsForBitshala} expandable={expandable} />
        </ProposalSection>
      )}
    </>
  );
};

export default ProposalView;
