import { useMemo } from 'react';
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
import {
  githubProfileUrl,
  normalizeGithub,
  parseProposal,
} from '../../utils/proposalFormat';

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
  const proposal = proposalQuery.data?.proposal ?? '';
  const fields = useMemo(() => parseProposal(proposal), [proposal]);
  const links = fields.links.map((l) => l.trim()).filter(Boolean);
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
            disabled={isLoading || !proposal}
          >
            Print / Save as PDF
          </Button>
        </Stack>

        <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2.5, md: 0 }, py: { xs: 3, md: 5 } }}>
          {isLoading && <CircularProgress size={22} />}

          {!isLoading && app && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {fields.title || `${formatFellowshipType(app.type)} fellowship proposal`}
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
                  {fields.problemStatement || '—'}
                </Typography>
              </PrintSection>

              <PrintSection title="6-month plan & milestones">
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                  {fields.plan || '—'}
                </Typography>
              </PrintSection>

              {(fields.github || links.length > 0) && (
                <PrintSection title="Links">
                  <Stack spacing={0.5}>
                    {fields.github && (
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
