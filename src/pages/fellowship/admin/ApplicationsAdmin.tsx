import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Pagination,
} from '@mui/material';
import FellowshipLayout from '../../../components/fellowship/FellowshipLayout';
import StatusChip from '../../../components/fellowship/StatusChip';
import MarkdownView from '../../../components/fellowship/MarkdownView';
import {
  useApplications,
  useApplicationProposal,
  useReviewApplication,
} from '../../../hooks/fellowshipHooks';
import {
  FellowshipApplicationStatus,
  FellowshipType,
  type GetFellowshipApplicationResponseDto,
} from '../../../types/fellowship';
import { extractErrorMessage } from '../../../utils/errorUtils';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: FellowshipApplicationStatus | ''; label: string }[] = [
  { value: FellowshipApplicationStatus.SUBMITTED, label: 'Submitted' },
  { value: FellowshipApplicationStatus.ACCEPTED, label: 'Accepted' },
  { value: FellowshipApplicationStatus.REJECTED, label: 'Rejected' },
  { value: '', label: 'All' },
];

const TYPE_FILTERS: { value: FellowshipType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: FellowshipType.DEVELOPER, label: 'Developer' },
  { value: FellowshipType.DESIGNER, label: 'Designer' },
  { value: FellowshipType.EDUCATOR, label: 'Educator' },
];

const ApplicationsAdmin = () => {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<FellowshipApplicationStatus | ''>(FellowshipApplicationStatus.SUBMITTED);
  const [type, setType] = useState<FellowshipType | ''>('');
  const [selected, setSelected] = useState<GetFellowshipApplicationResponseDto | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useApplications({
    page,
    pageSize: PAGE_SIZE,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
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
    <FellowshipLayout title="Applications review" maxWidth="lg">
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderColor: 'divider' }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <TextField
              select
              label="Status"
              size="small"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as FellowshipApplicationStatus | '');
                setPage(0);
              }}
              sx={{ minWidth: 160 }}
            >
              {STATUS_FILTERS.map((s) => (
                <MenuItem key={s.label} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Type"
              size="small"
              value={type}
              onChange={(e) => {
                setType(e.target.value as FellowshipType | '');
                setPage(0);
              }}
              sx={{ minWidth: 160 }}
            >
              {TYPE_FILTERS.map((t) => (
                <MenuItem key={t.label} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {isLoading && <CircularProgress size={22} />}
          {!isLoading && records.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
              No applications match these filters.
            </Typography>
          )}

          {!isLoading && records.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Applicant</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Reviewed by</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {r.userName || r.userEmail || '—'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {r.userEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>
                      <StatusChip status={r.status} />
                    </TableCell>
                    <TableCell>
                      {r.submittedAt
                        ? new Date(r.submittedAt).toLocaleDateString()
                        : new Date(r.createdAt).toLocaleDateString()}
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
          )}

          {totalPages > 1 && (
            <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page + 1}
                onChange={(_, p) => setPage(p - 1)}
                color="primary"
              />
            </Stack>
          )}
        </CardContent>
      </Card>

      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)}>
        <Box sx={{ width: { xs: '100vw', md: 640 }, p: 3 }}>
          {selected && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
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

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
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
    </FellowshipLayout>
  );
};

export default ApplicationsAdmin;
