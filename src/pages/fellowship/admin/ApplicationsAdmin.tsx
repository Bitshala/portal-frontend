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
  tableScrollSx,
  tableSx,
} from '../../../components/fellowship/tableStyles';
import {
  useApplications,
  useApplicationProposal,
  useReviewApplication,
} from '../../../hooks/fellowshipHooks';
import {
  FellowshipApplicationStatus,
  type GetFellowshipApplicationResponseDto,
} from '../../../types/fellowship';
import { extractErrorMessage } from '../../../utils/errorUtils';

const PAGE_SIZE = 20;

const STATUS_TABS: { label: string; value: FellowshipApplicationStatus | 'ALL' }[] = [
  { label: 'Submitted', value: FellowshipApplicationStatus.SUBMITTED },
  { label: 'Accepted', value: FellowshipApplicationStatus.ACCEPTED },
  { label: 'Rejected', value: FellowshipApplicationStatus.REJECTED },
  { label: 'All', value: 'ALL' },
];

const formatDate = (date: string | null) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const ApplicationsAdmin = () => {
  const [page, setPage] = useState(0);
  const [statusTab, setStatusTab] = useState<FellowshipApplicationStatus | 'ALL'>(
    FellowshipApplicationStatus.SUBMITTED,
  );
  const [selected, setSelected] = useState<GetFellowshipApplicationResponseDto | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const status = statusTab === 'ALL' ? '' : statusTab;

  const { data, isLoading } = useApplications({
    page,
    pageSize: PAGE_SIZE,
    ...(status ? { status } : {}),
  });
  const proposalQuery = useApplicationProposal(selected?.id ?? '', { enabled: !!selected });
  const reviewMut = useReviewApplication();

  const records = data?.records ?? [];
  const totalPages = data ? Math.ceil(data.totalRecords / PAGE_SIZE) : 1;

  const handleAccept = async () => {
    if (!selected) return;
    try {
      await reviewMut.mutateAsync({
        id: selected.id,
        body: { status: FellowshipApplicationStatus.ACCEPTED },
      });
      setToast({ kind: 'success', msg: 'Fellowship created in PENDING state.' });
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
        body: { status: FellowshipApplicationStatus.REJECTED, reviewerRemarks: remarks.trim() },
      });
      setToast({ kind: 'success', msg: 'Application rejected.' });
      setRejectOpen(false);
      setRemarks('');
      setSelected(null);
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  return (
    <FellowshipPageLayout title="Applications" subtitle="Review submitted fellowship applications." badge="Admin">
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
              setStatusTab(v as FellowshipApplicationStatus | 'ALL');
              setPage(0);
            }}
          />
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 10 }}>
            <CircularProgress size={36} sx={{ color: '#f97316' }} />
            <Typography variant="body2" sx={{ color: '#71717a' }}>Loading applications…</Typography>
          </Box>
        ) : records.length === 0 ? (
          <Box sx={emptyStateSx}>
            <Typography variant="body2" sx={{ color: '#71717a' }}>
              No applications match these filters.
            </Typography>
          </Box>
        ) : (
          <Box sx={tableScrollSx}>
            <Table sx={tableSx} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>Name</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Email</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Type</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Status</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Submitted</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Reviewed</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Reviewed by</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Remarks</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} hover sx={tableRowSx} onClick={() => setSelected(r)}>
                    <TableCell sx={{ ...tableBodyCellSx, color: '#fafafa', fontWeight: 600 }}>
                      {r.userName || '—'}
                    </TableCell>
                    <TableCell sx={{ ...tableBodyCellSx, color: '#a1a1aa' }}>
                      {r.userEmail || '—'}
                    </TableCell>
                    <TableCell sx={tableBodyCellSx}>{r.type}</TableCell>
                    <TableCell sx={tableBodyCellSx}>
                      <StatusChip status={r.status} />
                    </TableCell>
                    <TableCell sx={{ ...tableBodyCellSx, color: '#a1a1aa' }}>
                      {formatDate(r.submittedAt ?? r.createdAt)}
                    </TableCell>
                    <TableCell sx={{ ...tableBodyCellSx, color: '#a1a1aa' }}>
                      {formatDate(r.reviewedAt)}
                    </TableCell>
                    <TableCell sx={{ ...tableBodyCellSx, color: '#a1a1aa' }}>
                      {r.reviewerName ?? '—'}
                    </TableCell>
                    <TableCell sx={{ ...tableBodyCellSx, color: '#a1a1aa' }}>
                      {r.reviewerRemarks ?? '—'}
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
          </Box>
        )}
      </Paper>

      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, p) => setPage(p - 1)}
            color="primary"
          />
        </Stack>
      )}

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{
          sx: { width: { xs: '100vw', md: 'min(960px, calc(100vw - 80px))' } },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto', p: { xs: 3, md: 5 } }}>
          {selected && (
            <>
              <Button
                onClick={() => setSelected(null)}
                sx={{ mb: 3, pl: 0, color: 'text.secondary', '&:hover': { bgcolor: 'transparent', color: 'text.primary' } }}
              >
                ← Back to applications
              </Button>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
              >
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {selected.userName || selected.userEmail || 'Applicant'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {selected.type} · submitted{' '}
                    {selected.submittedAt
                      ? new Date(selected.submittedAt).toLocaleDateString()
                      : '—'}
                  </Typography>
                </Box>
                <StatusChip status={selected.status} />
              </Stack>

              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                Proposal
              </Typography>
              {proposalQuery.isLoading && <CircularProgress size={18} />}
              {proposalQuery.data && <MarkdownView content={proposalQuery.data.proposal} />}

              {selected.status === FellowshipApplicationStatus.SUBMITTED && (
                <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                  <Button variant="contained" onClick={handleAccept} disabled={reviewMut.isPending}>
                    Accept
                  </Button>
                  <Button variant="outlined" color="error" onClick={() => setRejectOpen(true)}>
                    Reject
                  </Button>
                </Stack>
              )}

              {selected.status !== FellowshipApplicationStatus.SUBMITTED && selected.reviewerName && (
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
        <DialogTitle>Reject application</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Share feedback — this will be shown to the applicant.
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

export default ApplicationsAdmin;
