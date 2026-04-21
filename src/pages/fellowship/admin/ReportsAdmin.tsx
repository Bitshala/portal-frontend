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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import StatusChip from '../../../components/fellowship/StatusChip';
import MarkdownView from '../../../components/fellowship/MarkdownView';
import Tabs from '../../../components/ui/Tabs';
import {
  adminCardSx,
  adminToolbarSx,
  emptyStateSx,
  tableBodyCellSx,
  tableHeaderCellSx,
  tableRowSx,
} from '../../../components/fellowship/tableStyles';
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

const STATUS_TABS: { label: string; value: FellowshipReportStatus | 'ALL' }[] = [
  { label: 'Submitted', value: FellowshipReportStatus.SUBMITTED },
  { label: 'Approved', value: FellowshipReportStatus.APPROVED },
  { label: 'Rejected', value: FellowshipReportStatus.REJECTED },
  { label: 'All', value: 'ALL' },
];

const monthName = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });

const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthName(i + 1) }));

const ReportsAdmin = () => {
  const now = new Date();
  const [page, setPage] = useState(0);
  const [statusTab, setStatusTab] = useState<FellowshipReportStatus | 'ALL'>(
    FellowshipReportStatus.SUBMITTED,
  );
  const [month, setMonth] = useState<number | ''>(now.getMonth() + 1);
  const [year, setYear] = useState<number | ''>(now.getFullYear());
  const [selected, setSelected] = useState<GetFellowshipReportResponseDto | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const status = statusTab === 'ALL' ? '' : statusTab;

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
    <FellowshipPageLayout title="Reports" subtitle="Review monthly fellowship reports." badge="Admin">
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Paper elevation={0} sx={adminCardSx}>
        <Box sx={adminToolbarSx}>
          <Tabs
            tabs={STATUS_TABS.map((t) => ({ label: t.label, value: t.value }))}
            activeTab={statusTab}
            onChange={(v) => {
              setStatusTab(v as FellowshipReportStatus | 'ALL');
              setPage(0);
            }}
          />
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: { xs: 0, sm: 0.5 } }}>
            <TextField
              select
              size="small"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value === '' ? '' : Number(e.target.value));
                setPage(0);
              }}
              sx={{
                minWidth: 140,
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#18181b',
                  color: '#fafafa',
                  '& fieldset': { borderColor: '#3f3f46' },
                  '&:hover fieldset': { borderColor: '#52525b' },
                  '&.Mui-focused fieldset': { borderColor: '#f97316' },
                },
                '& .MuiSelect-icon': { color: '#a1a1aa' },
              }}
              SelectProps={{
                MenuProps: {
                  PaperProps: { sx: { bgcolor: '#18181b', border: '1px solid #27272a', color: '#fafafa' } },
                },
                displayEmpty: true,
                renderValue: (v) => (v === '' ? 'Any month' : monthName(Number(v))),
              }}
            >
              <MenuItem value="">Any month</MenuItem>
              {monthOptions.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              size="small"
              value={year}
              onChange={(e) => {
                setYear(e.target.value === '' ? '' : Number(e.target.value));
                setPage(0);
              }}
              placeholder="Year"
              sx={{
                minWidth: 100,
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#18181b',
                  color: '#fafafa',
                  '& fieldset': { borderColor: '#3f3f46' },
                  '&:hover fieldset': { borderColor: '#52525b' },
                  '&.Mui-focused fieldset': { borderColor: '#f97316' },
                },
                '& input': { colorScheme: 'dark' },
              }}
            />
          </Stack>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 10 }}>
            <CircularProgress size={36} sx={{ color: '#f97316' }} />
            <Typography variant="body2" sx={{ color: '#71717a' }}>Loading reports…</Typography>
          </Box>
        ) : records.length === 0 ? (
          <Box sx={emptyStateSx}>
            <Typography variant="body2" sx={{ color: '#71717a' }}>No reports match these filters.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderCellSx}>Fellow</TableCell>
                <TableCell sx={tableHeaderCellSx}>Month</TableCell>
                <TableCell sx={tableHeaderCellSx}>Status</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, display: { xs: 'none', md: 'table-cell' } }}>Submitted</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, display: { xs: 'none', md: 'table-cell' } }}>Reviewed by</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover sx={tableRowSx} onClick={() => setSelected(r)}>
                  <TableCell sx={tableBodyCellSx}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#fafafa' }}>
                      {r.userName || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={tableBodyCellSx}>{monthName(r.month)} {r.year}</TableCell>
                  <TableCell sx={tableBodyCellSx}><StatusChip status={r.status} /></TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, display: { xs: 'none', md: 'table-cell' }, color: '#a1a1aa' }}>
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, display: { xs: 'none', md: 'table-cell' }, color: '#a1a1aa' }}>
                    {r.reviewerName ?? '—'}
                  </TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, textAlign: 'right' }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={(e) => { e.stopPropagation(); setSelected(r); }}
                      sx={{ color: '#fb923c', '&:hover': { bgcolor: 'rgba(249,115,22,0.08)' } }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
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
    </FellowshipPageLayout>
  );
};

export default ReportsAdmin;
