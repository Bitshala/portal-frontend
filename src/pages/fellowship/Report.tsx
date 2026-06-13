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
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import StatusChip from '../../components/fellowship/StatusChip';
import {
  useCreateReport,
  useDeleteReport,
  useFellowship,
  useMyFellowships,
  useMyReports,
  useReport,
  useReportContent,
  useSubmitReport,
  useUpdateReport,
} from '../../hooks/fellowshipHooks';
import { FellowshipReportStatus, type GetFellowshipResponseDto } from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';
import { formatFellowshipType } from '../../utils/fellowshipFormat';
import { useFellowshipProjectTitle } from '../../hooks/useFellowshipProjectTitle';

// Label for a fellowship in the picker: project name (from the proposal) with
// the track in parens, falling back to just the track when there's no title.
const FellowshipOptionLabel = ({ fellowship }: { fellowship: GetFellowshipResponseDto }) => {
  const title = useFellowshipProjectTitle(fellowship);
  const track = formatFellowshipType(fellowship.type);
  return <>{title ? `${title} (${track})` : track}</>;
};

const monthName = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });

const Report = () => {
  const { fellowshipId: routeFellowshipId, id: reportIdParam } = useParams<{
    fellowshipId: string;
    id?: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const creatingNew = !reportIdParam || reportIdParam === 'new';
  const reportId = creatingNew ? null : reportIdParam!;

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // The fellowship a new report is filed against — seeded from the URL but
  // changeable via the dropdown, so a fellow with several can pick one.
  const [selectedFellowshipId, setSelectedFellowshipId] = useState<string>(routeFellowshipId ?? '');
  useEffect(() => {
    if (routeFellowshipId) setSelectedFellowshipId(routeFellowshipId);
  }, [routeFellowshipId]);
  const fellowshipId = selectedFellowshipId;

  const initialMonth = Number(searchParams.get('month')) || currentMonth;
  const [month, setMonth] = useState<number>(initialMonth);
  const [content, setContent] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const fellowshipsQuery = useMyFellowships({ page: 0, pageSize: 50 });
  const fellowshipOptions = useMemo(
    () => fellowshipsQuery.data?.records ?? [],
    [fellowshipsQuery.data?.records],
  );

  const { data: fellowship } = useFellowship(fellowshipId, { enabled: !!fellowshipId });
  const fellowshipTitle = useFellowshipProjectTitle(fellowship);
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
    if (report.data) setMonth(report.data.month);
  }, [report.data]);

  // Selectable months run from the fellowship's start month up to the current
  // month (you can file the current month in advance); reports can't predate the
  // contract. Year is always the current year, so it isn't a separate field.
  const monthOptions = useMemo(() => {
    const start = fellowship?.startDate ? new Date(fellowship.startDate) : null;
    const startMonth =
      start && start.getFullYear() === currentYear ? start.getMonth() + 1 : 1;
    const lo = Math.min(startMonth, currentMonth);
    const opts: { value: number; label: string }[] = [];
    for (let m = lo; m <= currentMonth; m++) opts.push({ value: m, label: monthName(m) });
    return opts.length ? opts : [{ value: currentMonth, label: monthName(currentMonth) }];
  }, [fellowship?.startDate, currentMonth, currentYear]);

  // Keep the selected month within the allowed range when creating.
  useEffect(() => {
    if (creatingNew && !monthOptions.some((o) => o.value === month)) {
      setMonth(monthOptions[monthOptions.length - 1].value);
    }
  }, [monthOptions, creatingNew, month]);

  const pastReports = useMemo(
    () => (myReports.data?.records ?? []).filter((r) => r.fellowshipId === fellowshipId),
    [myReports.data?.records, fellowshipId],
  );

  const current = reportId ? report.data : null;
  const isEditable = !reportId || current?.status === FellowshipReportStatus.DRAFT;
  // New reports always belong to the current year; existing ones keep their own.
  const year = current?.year ?? currentYear;

  const handleSaveDraft = async () => {
    if (!fellowshipId || !content.trim()) return;
    try {
      if (reportId) {
        await updateMut.mutateAsync({ id: reportId, body: { content } });
        setToast({ kind: 'success', msg: 'Draft saved.' });
      } else {
        const created = await createMut.mutateAsync({ fellowshipId, month, year: currentYear, content });
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
    if (!content.trim() || !fellowshipId) return;
    try {
      let id = reportId;
      if (!id) {
        const created = await createMut.mutateAsync({ fellowshipId, month, year: currentYear, content });
        id = created.id;
        navigate(`/fellowship/fellowships/${fellowshipId}/reports/${id}`, { replace: true });
      } else {
        await updateMut.mutateAsync({ id, body: { content } });
      }
      await submitMut.mutateAsync({ id });
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
      navigate('/fellowship/reports');
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  return (
    <FellowshipPageLayout>
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Button variant="text" size="small" onClick={() => navigate('/fellowship/reports')} sx={{ mb: 2 }}>
        ← Back to reports
      </Button>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {fellowshipTitle
                      ? `${fellowshipTitle}${fellowship ? ` (${formatFellowshipType(fellowship.type)})` : ''}`
                      : fellowship
                        ? formatFellowshipType(fellowship.type)
                        : 'Fellowship'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {monthName(month)} {year}
                  </Typography>
                </Box>
                {current && <StatusChip status={current.status} />}
              </Stack>

              {creatingNew && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    select
                    label="Fellowship"
                    value={fellowshipOptions.some((f) => f.id === fellowshipId) ? fellowshipId : ''}
                    onChange={(e) => setSelectedFellowshipId(e.target.value)}
                    size="small"
                    sx={{ minWidth: 220 }}
                  >
                    {fellowshipOptions.length === 0 && (
                      <MenuItem value="" disabled>
                        No fellowships
                      </MenuItem>
                    )}
                    {fellowshipOptions.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        <FellowshipOptionLabel fellowship={f} />
                      </MenuItem>
                    ))}
                  </TextField>
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
                  disabled={
                    !isEditable ||
                    !fellowshipId ||
                    !content.trim() ||
                    createMut.isPending ||
                    updateMut.isPending
                  }
                >
                  {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save draft'}
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={
                    !isEditable ||
                    !fellowshipId ||
                    !content.trim() ||
                    submitMut.isPending ||
                    createMut.isPending ||
                    updateMut.isPending
                  }
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
    </FellowshipPageLayout>
  );
};

export default Report;
