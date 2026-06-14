import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { Plus, X } from 'lucide-react';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import MarkdownView from '../../components/fellowship/MarkdownView';
import StatusChip from '../../components/fellowship/StatusChip';
import { fontFamilyMono } from '../../components/fellowship/theme';
import { useMyFellowships, useMyReports, useReportContent } from '../../hooks/fellowshipHooks';
import { useFellowshipProjectTitle } from '../../hooks/useFellowshipProjectTitle';
import { formatFellowshipType } from '../../utils/fellowshipFormat';
import { parseReportContent } from '../../utils/reportContent';
import {
  FellowshipReportStatus,
  FellowshipStatus,
  type GetFellowshipReportResponseDto,
  type GetFellowshipResponseDto,
} from '../../types/fellowship';

const monthName = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatAmount = (amountUsd: string | null): string => {
  if (!amountUsd) return '—';
  const n = Number(amountUsd);
  if (Number.isNaN(n)) return amountUsd;
  return `$${n.toFixed(2)}/mo`;
};

const COLS =
  'minmax(160px, 1.6fr) minmax(120px, 1fr) minmax(110px, 0.9fr) minmax(100px, 0.8fr) minmax(110px, 0.9fr) minmax(110px, 0.8fr)';
const COL_GAP = 3;

const HeaderRow = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: COLS,
      columnGap: COL_GAP,
      px: 2.5,
      py: 1.25,
      borderBottom: '1px solid',
      borderColor: 'divider',
      color: 'text.secondary',
      fontSize: '0.66rem',
      letterSpacing: 0.8,
      fontWeight: 700,
      textTransform: 'uppercase',
    }}
  >
    <Box>Project</Box>
    <Box>Fellowship</Box>
    <Box>Start date</Box>
    <Box>Amount</Box>
    <Box>Period</Box>
    <Box>Status</Box>
  </Box>
);

const ReportRow = ({
  report,
  fellowship,
  onOpen,
}: {
  report: GetFellowshipReportResponseDto;
  fellowship?: GetFellowshipResponseDto;
  onOpen: () => void;
}) => {
  const project = useFellowshipProjectTitle(fellowship) || null;

  return (
    <Box
      onClick={onOpen}
      sx={{
        display: 'grid',
        gridTemplateColumns: COLS,
        columnGap: COL_GAP,
        alignItems: 'center',
        px: 2.5,
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'background-color 0.12s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: '0.9rem',
          color: project ? 'text.primary' : 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={project ?? undefined}
      >
        {project ?? 'Project title not provided'}
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
        {fellowship ? formatFellowshipType(fellowship.type) : '—'}
      </Typography>
      <Typography
        sx={{ fontFamily: fontFamilyMono, fontSize: '0.78rem', color: 'text.secondary' }}
      >
        {formatDate(fellowship?.startDate ?? null)}
      </Typography>
      <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.82rem' }}>
        {formatAmount(fellowship?.amountUsd ?? null)}
      </Typography>
      <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
        {monthName(report.month)} {report.year}
      </Typography>
      <Box>
        <StatusChip status={report.status} />
      </Box>
    </Box>
  );
};

const ReportViewDialog = ({
  report,
  fellowship,
  onClose,
}: {
  report: GetFellowshipReportResponseDto;
  fellowship?: GetFellowshipResponseDto;
  onClose: () => void;
}) => {
  const contentQuery = useReportContent(report.id);
  const project = useFellowshipProjectTitle(fellowship) || null;
  const { links, body } = useMemo(
    () => parseReportContent(contentQuery.data?.content ?? ''),
    [contentQuery.data?.content],
  );
  const realLinks = links.filter((l) => l.trim());

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              {monthName(report.month)} {report.year}
              {fellowship ? ` · ${formatFellowshipType(fellowship.type)}` : ''}
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: project ? 'text.primary' : 'text.secondary' }}
            >
              {project ?? 'Project title not provided'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip status={report.status} />
            <IconButton aria-label="Close" onClick={onClose} size="small">
              <X size={18} />
            </IconButton>
          </Stack>
        </Stack>

        {report.status === FellowshipReportStatus.REJECTED && report.reviewerRemarks && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Reviewer remarks:</strong> {report.reviewerRemarks}
          </Alert>
        )}

        {contentQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <>
            {realLinks.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Pull request / issue links
                </Typography>
                <Stack spacing={0.5}>
                  {realLinks.map((link, i) => (
                    <Link
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ wordBreak: 'break-all', fontSize: '0.88rem' }}
                    >
                      {link}
                    </Link>
                  ))}
                </Stack>
              </Box>
            )}
            {body.trim() ? (
              <MarkdownView content={body} />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                This report has no content.
              </Typography>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const MyReports = () => {
  const navigate = useNavigate();
  const [viewing, setViewing] = useState<GetFellowshipReportResponseDto | null>(null);
  const reportsQuery = useMyReports({ page: 0, pageSize: 100 });
  const fellowshipsQuery = useMyFellowships({ page: 0, pageSize: 20 });

  const reports = useMemo(() => {
    const records = reportsQuery.data?.records ?? [];
    // Newest reporting period first.
    return [...records].sort((a, b) => b.year - a.year || b.month - a.month);
  }, [reportsQuery.data?.records]);

  // New reports can only be filed against an active fellowship.
  const reportableFellowship = useMemo(() => {
    const fellowships = fellowshipsQuery.data?.records ?? [];
    return fellowships.find((f) => f.status === FellowshipStatus.ACTIVE) ?? null;
  }, [fellowshipsQuery.data?.records]);

  const isLoading = reportsQuery.isLoading || fellowshipsQuery.isLoading;

  return (
    <FellowshipPageLayout
      title="My reports"
      subtitle="Monthly progress reports for your fellowship."
      hideIcon
    >
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={22} />
        </Box>
      ) : (
        <>
          {reportableFellowship && (
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Plus size={16} />}
                onClick={() =>
                  navigate(`/fellowship/fellowships/${reportableFellowship.id}/reports/new`)
                }
              >
                New report
              </Button>
            </Stack>
          )}

          {reports.length === 0 ? (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 0.75,
                bgcolor: 'background.paper',
                py: 6,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                No reports yet
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Submit a monthly report to keep your fellowship on track.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 0.75,
                bgcolor: 'background.paper',
                overflow: 'auto',
              }}
            >
              <Box sx={{ minWidth: 760 }}>
                <HeaderRow />
                {reports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    fellowship={report.fellowship}
                    onOpen={() => {
                      // Drafts open the editor page; submitted reports preview in a modal.
                      if (report.status === FellowshipReportStatus.DRAFT) {
                        navigate(
                          `/fellowship/fellowships/${report.fellowshipId}/reports/${report.id}`,
                        );
                      } else {
                        setViewing(report);
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </>
      )}

      {viewing && (
        <ReportViewDialog
          report={viewing}
          fellowship={viewing.fellowship}
          onClose={() => setViewing(null)}
        />
      )}
    </FellowshipPageLayout>
  );
};

export default MyReports;
