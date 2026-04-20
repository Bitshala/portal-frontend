import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AdminFellowshipLayout from '../../../components/fellowship/AdminFellowshipLayout';
import StatusChip from '../../../components/fellowship/StatusChip';
import MarkdownView from '../../../components/fellowship/MarkdownView';
import {
  useReportContent,
  useReports,
  useReviewReport,
} from '../../../hooks/fellowshipHooks';
import {
  FellowshipReportStatus,
  type GetFellowshipReportResponseDto,
} from '../../../types/fellowship';
import { extractErrorMessage } from '../../../utils/errorUtils';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: FellowshipReportStatus | ''; label: string }[] = [
  { value: FellowshipReportStatus.SUBMITTED, label: 'Submitted' },
  { value: FellowshipReportStatus.APPROVED, label: 'Approved' },
  { value: FellowshipReportStatus.REJECTED, label: 'Rejected' },
  { value: '', label: 'All (no drafts)' },
];

const monthName = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });

const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthName(i + 1) }));

const ReportsAdmin = () => {
  const now = new Date();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<FellowshipReportStatus | ''>(FellowshipReportStatus.SUBMITTED);
  const [month, setMonth] = useState<number | ''>(now.getMonth() + 1);
  const [year, setYear] = useState<number | ''>(now.getFullYear());
  const [selected, setSelected] = useState<GetFellowshipReportResponseDto | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const query = {
    page,
    pageSize: PAGE_SIZE,
    ...(status ? { status } : {}),
    ...(month ? { month } : {}),
    ...(year ? { year } : {}),
  };
  const { data, isLoading } = useReports(query);
  const contentQuery = useReportContent(selected?.id ?? '', { enabled: !!selected });
  const reviewMut = useReviewReport();

  const records = data?.records ?? [];
  const totalPages = data ? Math.ceil(data.totalRecords / PAGE_SIZE) : 1;

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await reviewMut.mutateAsync({
        id: selected.id,
        body: { status: FellowshipReportStatus.APPROVED },
      });
      setToast({ kind: 'success', msg: 'Report approved.' });
      setSelected(null);
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleReject = async () => {
    if (!selected || !remarks.trim()) return;
    try {
      await reviewMut.mutateAsync({
        id: selected.id,
        body: { status: FellowshipReportStatus.REJECTED, reviewerRemarks: remarks.trim() },
      });
      setToast({ kind: 'success', msg: 'Report rejected.' });
      setRejectOpen(false);
      setRemarks('');
      setSelected(null);
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  return (
    <AdminFellowshipLayout title="Reports review">
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Status"
          size="small"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as FellowshipReportStatus | '');
            setPage(0);
          }}
          sx={{ minWidth: 160, bgcolor: 'background.paper' }}
        >
          {STATUS_FILTERS.map((s) => (
            <MenuItem key={s.label} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Month"
          size="small"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value === '' ? '' : Number(e.target.value));
            setPage(0);
          }}
          sx={{ minWidth: 140, bgcolor: 'background.paper' }}
        >
          <MenuItem value="">Any</MenuItem>
          {monthOptions.map((m) => (
            <MenuItem key={m.value} value={m.value}>
              {m.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Year"
          type="number"
          size="small"
          value={year}
          onChange={(e) => {
            setYear(e.target.value === '' ? '' : Number(e.target.value));
            setPage(0);
          }}
          sx={{ minWidth: 120, bgcolor: 'background.paper' }}
        />
      </Stack>

      {isLoading && <CircularProgress size={22} />}
      {!isLoading && records.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
          No reports match these filters.
        </Typography>
      )}
      {!isLoading && records.length > 0 && (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableCell>Fellow</TableCell>
                <TableCell>Month</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Reviewed by</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                  <TableCell>{r.userName || '—'}</TableCell>
                  <TableCell>
                    {monthName(r.month)} {r.year}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={r.status} />
                  </TableCell>
                  <TableCell>
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{r.reviewerName ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="text">
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
          <Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} color="primary" />
        </Stack>
      )}

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: '100vw', maxWidth: '100vw' } }}
      >
        <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto', p: { xs: 3, md: 5 } }}>
          {selected && (
            <>
              <Button
                onClick={() => setSelected(null)}
                sx={{ mb: 3, pl: 0, color: 'text.secondary', '&:hover': { bgcolor: 'transparent', color: 'text.primary' } }}
              >
                ← Back to reports
              </Button>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {selected.userName || '—'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {monthName(selected.month)} {selected.year}
                  </Typography>
                </Box>
                <StatusChip status={selected.status} />
              </Stack>

              {contentQuery.isLoading && <CircularProgress size={18} />}
              {contentQuery.data && <MarkdownView content={contentQuery.data.content} />}

              {selected.status === FellowshipReportStatus.SUBMITTED && (
                <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                  <Button variant="contained" onClick={handleApprove} disabled={reviewMut.isPending}>
                    Approve
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => setRejectOpen(true)}>
                    Reject
                  </Button>
                </Stack>
              )}

              {selected.status !== FellowshipReportStatus.SUBMITTED && selected.reviewerName && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  Reviewed by <strong>{selected.reviewerName}</strong>
                  {selected.reviewerRemarks ? ` — "${selected.reviewerRemarks}"` : ''}
                </Alert>
              )}
            </>
          )}
        </Box>
      </Drawer>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reject report</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Explain what needs to change — the fellow will see these remarks.
          </Typography>
          <TextField
            multiline
            fullWidth
            minRows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks (required)"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!remarks.trim() || reviewMut.isPending}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </AdminFellowshipLayout>
  );
};

export default ReportsAdmin;
