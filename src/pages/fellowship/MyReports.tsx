import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import StatusChip from '../../components/fellowship/StatusChip';
import { fontFamilyMono } from '../../components/fellowship/theme';
import { useMyFellowships, useMyReports } from '../../hooks/fellowshipHooks';
import { FellowshipStatus } from '../../types/fellowship';

const monthName = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const MyReports = () => {
  const navigate = useNavigate();
  const reportsQuery = useMyReports({ page: 0, pageSize: 100 });
  const fellowshipsQuery = useMyFellowships({ page: 0, pageSize: 20 });

  const reports = useMemo(() => {
    const records = reportsQuery.data?.records ?? [];
    // Newest reporting period first.
    return [...records].sort((a, b) => b.year - a.year || b.month - a.month);
  }, [reportsQuery.data?.records]);

  // New reports are filed against the active fellowship (or the only one).
  const reportableFellowship = useMemo(() => {
    const fellowships = fellowshipsQuery.data?.records ?? [];
    return fellowships.find((f) => f.status === FellowshipStatus.ACTIVE) ?? fellowships[0] ?? null;
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
                overflow: 'hidden',
              }}
            >
              {reports.map((report) => (
                <Stack
                  key={report.id}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  onClick={() =>
                    navigate(
                      `/fellowship/fellowships/${report.fellowshipId}/reports/${report.id}`,
                    )
                  }
                  sx={{
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
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
                      {monthName(report.month)} {report.year}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontFamily: fontFamilyMono,
                        fontSize: '0.72rem',
                      }}
                    >
                      updated {formatDate(report.updatedAt)}
                    </Typography>
                  </Box>
                  <StatusChip status={report.status} />
                </Stack>
              ))}
            </Box>
          )}
        </>
      )}
    </FellowshipPageLayout>
  );
};

export default MyReports;
