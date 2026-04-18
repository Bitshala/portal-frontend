import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Trash2 } from 'lucide-react';
import FellowshipLayout from '../../components/fellowship/FellowshipLayout';
import StatusChip from '../../components/fellowship/StatusChip';
import {
  useCreateReport,
  useDeleteReport,
  useFellowship,
  useMyReports,
  useReport,
  useReportContent,
  useSubmitReport,
  useUpdateReport,
} from '../../hooks/fellowshipHooks';
import { FellowshipReportStatus } from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';

const monthName = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: monthName(i + 1),
}));

const Report = () => {
  const { fellowshipId, id: reportIdParam } = useParams<{ fellowshipId: string; id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const creatingNew = !reportIdParam || reportIdParam === 'new';
  const reportId = creatingNew ? null : reportIdParam!;

  const initialMonth = Number(searchParams.get('month')) || new Date().getMonth() + 1;
  const initialYear = Number(searchParams.get('year')) || new Date().getFullYear();

  const [month, setMonth] = useState<number>(initialMonth);
  const [year, setYear] = useState<number>(initialYear);
  const [content, setContent] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const { data: fellowship } = useFellowship(fellowshipId ?? '', { enabled: !!fellowshipId });
  const report = useReport(reportId ?? '', { enabled: !!reportId });
  const reportContent = useReportContent(reportId ?? '', {
    enabled: !!reportId && report.data?.status === FellowshipReportStatus.DRAFT,
  });
  const myReports = useMyReports({ page: 0, pageSize: 24 });

  const createMut = useCreateReport();
  const updateMut = useUpdateReport();
  const submitMut = useSubmitReport();
  const deleteMut = useDeleteReport();

  useEffect(() => {
    if (reportContent.data?.content !== undefined) setContent(reportContent.data.content);
  }, [reportContent.data?.content]);

  useEffect(() => {
    if (report.data) {
      setMonth(report.data.month);
      setYear(report.data.year);
    }
  }, [report.data]);

  const pastReports = useMemo(
    () => (myReports.data?.records ?? []).filter((r) => r.fellowshipId === fellowshipId),
    [myReports.data?.records, fellowshipId],
  );

  const current = reportId ? report.data : null;
  const isEditable = !reportId || current?.status === FellowshipReportStatus.DRAFT;

  const handleSaveDraft = async () => {
    if (!fellowshipId || !content.trim()) return;
    try {
      if (reportId) {
        await updateMut.mutateAsync({ id: reportId, body: { content } });
        setToast({ kind: 'success', msg: 'Draft saved.' });
      } else {
        const created = await createMut.mutateAsync({ fellowshipId, month, year, content });
        setToast({ kind: 'success', msg: 'Draft created.' });
        navigate(`/fellowship/fellowships/${fellowshipId}/reports/${created.id}`, {
          replace: true,
        });
      }
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleSubmit = async () => {
    if (!reportId) return;
    try {
      await submitMut.mutateAsync({ id: reportId });
      setToast({ kind: 'success', msg: 'Submitted for review.' });
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleDelete = async () => {
    if (!reportId) return;
    if (!confirm('Delete this draft?')) return;
    try {
      await deleteMut.mutateAsync({ id: reportId });
      setToast({ kind: 'success', msg: 'Draft deleted.' });
      navigate(`/fellowship/fellowships/${fellowshipId}`);
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  return (
    <FellowshipLayout>
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Button variant="text" size="small" onClick={() => navigate(`/fellowship/fellowships/${fellowshipId}`)} sx={{ mb: 2 }}>
        ← Back to dashboard
      </Button>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {fellowship?.projectName || fellowship?.type || 'Fellowship'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {monthName(month)} {year}
                  </Typography>
                </Box>
                {current && <StatusChip status={current.status} />}
              </Stack>

              {creatingNew && (
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    select
                    label="Month"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    size="small"
                    sx={{ minWidth: 160 }}
                  >
                    {monthOptions.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    size="small"
                    inputProps={{ min: 2020 }}
                    sx={{ minWidth: 120 }}
                  />
                </Stack>
              )}

              {current?.status === FellowshipReportStatus.REJECTED && current.reviewerRemarks && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <strong>Reviewer remarks:</strong> {current.reviewerRemarks}
                </Alert>
              )}

              <TextField
                multiline
                fullWidth
                minRows={12}
                maxRows={24}
                placeholder="Progress this month — wins, blockers, code/docs links, next month's focus. Markdown supported."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!isEditable || (!!reportId && reportContent.isLoading)}
              />

              <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={handleSaveDraft}
                  disabled={!isEditable || !content.trim() || createMut.isPending || updateMut.isPending}
                >
                  {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save draft'}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!reportId || !isEditable || !content.trim() || submitMut.isPending}
                >
                  {submitMut.isPending ? 'Submitting…' : 'Submit'}
                </Button>
                {reportId && isEditable && (
                  <Button variant="text" color="error" startIcon={<Trash2 size={16} />} onClick={handleDelete}>
                    Delete draft
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                Past reports
              </Typography>
              {myReports.isLoading && <CircularProgress size={18} />}
              {!myReports.isLoading && pastReports.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No past reports.
                </Typography>
              )}
              <Stack spacing={1} divider={<Divider flexItem />}>
                {pastReports.map((r) => (
                  <Box
                    key={r.id}
                    onClick={() => navigate(`/fellowship/fellowships/${fellowshipId}/reports/${r.id}`)}
                    sx={{
                      p: 1.25,
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor: r.id === reportId ? 'rgba(249,115,22,0.06)' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {monthName(r.month)} {r.year}
                      </Typography>
                      <StatusChip status={r.status} />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </FellowshipLayout>
  );
};

export default Report;
