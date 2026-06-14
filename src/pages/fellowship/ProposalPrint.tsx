import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  Divider,
  Stack,
  ThemeProvider,
  Typography,
} from '@mui/material';
import { ArrowLeft, Printer } from 'lucide-react';
import { fellowshipLightTheme } from '../../components/fellowship/theme';
import { useApplication, useApplicationProposal } from '../../hooks/fellowshipHooks';
import { formatFellowshipType } from '../../utils/fellowshipFormat';
import { githubProfileUrl, normalizeGithub } from '../../utils/proposalFormat';

// A long-text section, only rendered when there's content to show.
const PrintTextSection = ({ title, text }: { title: string; text: string | null | undefined }) =>
  text && text.trim() ? (
    <PrintSection title={title}>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
        {text}
      </Typography>
    </PrintSection>
  ) : null;

const PrintSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ mt: 3, breakInside: 'avoid-page' }}>
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        letterSpacing: 1,
        fontSize: '0.7rem',
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

/**
 * Clean, document-style proposal view for reviews, records and sharing.
 * "Print / Save as PDF" goes through the browser's print dialog — no
 * client-side PDF library needed.
 */
const ProposalPrint = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const appQuery = useApplication(id ?? '', { enabled: !!id });
  const proposalQuery = useApplicationProposal(id ?? '', { enabled: !!id });

  const app = appQuery.data;
  const fields = proposalQuery.data;
  const links = (fields?.links ?? []).map((l) => l.trim()).filter(Boolean);
  const domains = fields?.domains ?? [];
  const codingLanguages = fields?.codingLanguages ?? [];
  const educationInterests = fields?.educationInterests ?? [];
  const isLoading = appQuery.isLoading || proposalQuery.isLoading;

  return (
    <ThemeProvider theme={fellowshipLightTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#ffffff' }}>
        {/* Toolbar — never printed */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            px: { xs: 2, md: 6 },
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            displayPrint: 'none',
          }}
        >
          <Button startIcon={<ArrowLeft size={15} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            variant="contained"
            startIcon={<Printer size={15} />}
            onClick={() => window.print()}
            disabled={isLoading || !fields}
          >
            Print / Save as PDF
          </Button>
        </Stack>

        <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2.5, md: 0 }, py: { xs: 3, md: 5 } }}>
          {isLoading && <CircularProgress size={22} />}

          {!isLoading && app && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {fields?.title || `${formatFellowshipType(app.type)} fellowship proposal`}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                {app.applicantName ?? 'Unknown applicant'} ·{' '}
                {formatFellowshipType(app.type)} fellowship · submitted{' '}
                {new Date(app.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Typography>
              <Divider sx={{ mt: 2.5 }} />

              <PrintSection title="Problem statement">
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                  {fields?.problemStatement || '—'}
                </Typography>
              </PrintSection>

              <PrintSection title="6-month plan & milestones">
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                  {fields?.plan || '—'}
                </Typography>
              </PrintSection>

              {(fields?.mentorName || fields?.mentorContact) && (
                <PrintSection title="Mentor">
                  <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                    {fields?.mentorName || '—'}
                    {fields?.mentorContact ? ` · ${fields.mentorContact}` : ''}
                  </Typography>
                  {fields?.mentorTestimonial && (
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, mt: 1 }}
                    >
                      {fields.mentorTestimonial}
                    </Typography>
                  )}
                </PrintSection>
              )}

              {(fields?.github || links.length > 0) && (
                <PrintSection title="Links">
                  <Stack spacing={0.5}>
                    {fields?.github && (
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        GitHub:{' '}
                        <Box
                          component="a"
                          href={githubProfileUrl(fields.github)}
                          sx={{ color: 'inherit' }}
                        >
                          {githubProfileUrl(normalizeGithub(fields.github))}
                        </Box>
                      </Typography>
                    )}
                    {links.map((l) => (
                      <Typography key={l} variant="body2" sx={{ wordBreak: 'break-all' }}>
                        <Box component="a" href={l} sx={{ color: 'inherit' }}>
                          {l}
                        </Box>
                      </Typography>
                    ))}
                  </Stack>
                </PrintSection>
              )}

              {(fields?.projectName || fields?.projectGithubLink) && (
                <PrintSection title="Project">
                  <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                    {fields?.projectName || '—'}
                  </Typography>
                  {fields?.projectGithubLink && (
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', mt: 0.5 }}>
                      <Box component="a" href={fields.projectGithubLink} sx={{ color: 'inherit' }}>
                        {fields.projectGithubLink}
                      </Box>
                    </Typography>
                  )}
                </PrintSection>
              )}

              <PrintTextSection title="Academic background" text={fields?.academicBackground} />

              {fields?.graduationYear != null && (
                <PrintSection title="Graduation year">
                  <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                    {fields.graduationYear}
                  </Typography>
                </PrintSection>
              )}

              <PrintTextSection
                title="Professional experience"
                text={fields?.professionalExperience}
              />

              {domains.length > 0 && (
                <PrintSection title="Domains">
                  <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                    {domains.join(', ')}
                  </Typography>
                </PrintSection>
              )}

              {codingLanguages.length > 0 && (
                <PrintSection title="Coding languages">
                  <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                    {codingLanguages.join(', ')}
                  </Typography>
                </PrintSection>
              )}

              {educationInterests.length > 0 && (
                <PrintSection title="Education interests">
                  <Typography variant="body2" sx={{ lineHeight: 1.65 }}>
                    {educationInterests.join(', ')}
                  </Typography>
                </PrintSection>
              )}

              <PrintTextSection title="Bitcoin contributions" text={fields?.bitcoinContributions} />
              <PrintTextSection title="Bitcoin motivation" text={fields?.bitcoinMotivation} />
              <PrintTextSection title="Bitcoin OSS goal" text={fields?.bitcoinOssGoal} />
              <PrintTextSection title="Additional info" text={fields?.additionalInfo} />
              <PrintTextSection title="Questions for Bitshala" text={fields?.questionsForBitshala} />
            </>
          )}

          {!isLoading && !app && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Could not load this application.
            </Typography>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default ProposalPrint;
