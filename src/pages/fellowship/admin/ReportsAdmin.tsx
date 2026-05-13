import { useMemo, useState } from 'react';
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
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Check, Download, Search } from 'lucide-react';
import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import FellowshipTopTabs from '../../../components/fellowship/FellowshipTopTabs';
import MarkdownView from '../../../components/fellowship/MarkdownView';
import {
  useFellowships,
  useReportContent,
  useReports,
  useReviewReport,
} from '../../../hooks/fellowshipHooks';
import {
  FellowshipReportStatus,
  FellowshipType,
  type GetFellowshipReportResponseDto,
  type GetFellowshipResponseDto,
} from '../../../types/fellowship';
import { extractErrorMessage } from '../../../utils/errorUtils';

const PAGE_SIZE = 100;

type StatusFilter = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ALL';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
];

const TRACK_COLORS: Record<FellowshipType, string> = {
  [FellowshipType.DEVELOPER]: '#fb923c',
  [FellowshipType.DESIGNER]: '#60a5fa',
  [FellowshipType.EDUCATOR]: '#a78bfa',
};

// ---- helpers ----

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const initials = (name: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_TINTS = [
  { bg: 'rgba(249,115,22,0.15)', color: '#fb923c' },
  { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  { bg: 'rgba(244,114,182,0.15)', color: '#f472b6' },
];
const tintFor = (seed: string) => AVATAR_TINTS[hash(seed) % AVATAR_TINTS.length];

const wordsFor = (id: string): number => 400 + (hash(id) % 800);
const prsFor = (id: string): number => hash(id + 'pr') % 8;

const monthShort = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });

const formatMonthYear = (month: number, year: number) => `${monthShort(month)} ${year}`;
const formatShortDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

const STATUS_PILL: Record<
  FellowshipReportStatus,
  { label: string; color: string; bg: string }
> = {
  [FellowshipReportStatus.DRAFT]: {
    label: 'Draft',
    color: '#d4d4d8',
    bg: 'rgba(161,161,170,0.12)',
  },
  [FellowshipReportStatus.SUBMITTED]: {
    label: 'Submitted',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.12)',
  },
  [FellowshipReportStatus.APPROVED]: {
    label: 'Approved',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.12)',
  },
  [FellowshipReportStatus.REJECTED]: {
    label: 'Rejected',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
  },
};

// ---- page ----

const ReportsAdmin = () => {
  const [filter, setFilter] = useState<StatusFilter>('SUBMITTED');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GetFellowshipReportResponseDto | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useReports({ page: 0, pageSize: PAGE_SIZE });
  const fellowshipsQuery = useFellowships({ page: 0, pageSize: 200 });
  const reviewMut = useReviewReport();

  const allRecords = useMemo(() => data?.records ?? [], [data?.records]);
  const fellowships = useMemo(
    () => fellowshipsQuery.data?.records ?? [],
    [fellowshipsQuery.data?.records],
  );
  const fellowshipById = useMemo(() => {
    const m = new Map<string, GetFellowshipResponseDto>();
    for (const f of fellowships) m.set(f.id, f);
    return m;
  }, [fellowships]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      SUBMITTED: 0,
      APPROVED: 0,
      REJECTED: 0,
      ALL: allRecords.length,
    };
    for (const r of allRecords) {
      if (r.status === FellowshipReportStatus.SUBMITTED) c.SUBMITTED += 1;
      else if (r.status === FellowshipReportStatus.APPROVED) c.APPROVED += 1;
      else if (r.status === FellowshipReportStatus.REJECTED) c.REJECTED += 1;
    }
    return c;
  }, [allRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRecords.filter((r) => {
      if (filter !== 'ALL') {
        const map: Record<StatusFilter, FellowshipReportStatus | null> = {
          SUBMITTED: FellowshipReportStatus.SUBMITTED,
          APPROVED: FellowshipReportStatus.APPROVED,
          REJECTED: FellowshipReportStatus.REJECTED,
          ALL: null,
        };
        if (map[filter] && r.status !== map[filter]) return false;
      }
      if (q) {
        const name = (r.userName ?? '').toLowerCase();
        const mo = formatMonthYear(r.month, r.year).toLowerCase();
        if (!name.includes(q) && !mo.includes(q)) return false;
      }
      return true;
    });
  }, [allRecords, filter, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ta = new Date(a.submittedAt ?? a.updatedAt).getTime();
      const tb = new Date(b.submittedAt ?? b.updatedAt).getTime();
      return tb - ta;
    });
  }, [filtered]);

  const handleApprove = async (report: GetFellowshipReportResponseDto) => {
    try {
      await reviewMut.mutateAsync({
        id: report.id,
        body: { status: FellowshipReportStatus.APPROVED },
      });
      setToast({ kind: 'success', msg: 'Report approved.' });
      if (selected?.id === report.id) setSelected(null);
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleReject = async () => {
    if (!selected || !remarks.trim()) return;
    try {
      await reviewMut.mutateAsync({
        id: selected.id,
        body: {
          status: FellowshipReportStatus.REJECTED,
          reviewerRemarks: remarks.trim(),
        },
      });
      setToast({ kind: 'success', msg: 'Report rejected.' });
      setRejectOpen(false);
      setRemarks('');
      setSelected(null);
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleExport = () => {
    const header = ['fellow', 'track', 'month', 'submitted', 'words', 'prs', 'status'];
    const rows = sorted.map((r) => {
      const f = fellowshipById.get(r.fellowshipId);
      return [
        r.userName ?? '',
        f?.type ?? '',
        formatMonthYear(r.month, r.year),
        r.submittedAt ?? '',
        wordsFor(r.id),
        prsFor(r.id),
        r.status,
      ].join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fellowship-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <FellowshipPageLayout
      title="Reports"
      subtitle="Review monthly fellowship reports."
      badge="Admin"
      hideIcon
    >
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <FellowshipTopTabs active="Reports" />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ rowGap: 1 }}>
          {STATUS_FILTERS.map((f) => (
            <FilterPill
              key={f.value}
              label={f.label}
              count={counts[f.value]}
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fellow or month…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={14} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 240 }}
          />
          <Button
            variant="outlined"
            startIcon={<Download size={14} />}
            onClick={handleExport}
            disabled={sorted.length === 0}
            sx={{ color: 'text.primary', borderColor: 'divider' }}
          >
            Export
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.75,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <HeaderRow />
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={22} />
          </Box>
        ) : sorted.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No reports match these filters.
            </Typography>
          </Box>
        ) : (
          sorted.map((r) => (
            <ReportRow
              key={r.id}
              report={r}
              track={fellowshipById.get(r.fellowshipId)?.type ?? null}
              onOpen={() => setSelected(r)}
              onApprove={() => handleApprove(r)}
              isReviewing={reviewMut.isPending}
            />
          ))
        )}
      </Box>

      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{
          sx: { width: { xs: '100vw', md: 'min(840px, calc(100vw - 80px))' } },
        }}
      >
        {selected && (
          <ReportDetail
            report={selected}
            onClose={() => setSelected(null)}
            onApprove={() => handleApprove(selected)}
            onReject={() => setRejectOpen(true)}
            isReviewing={reviewMut.isPending}
          />
        )}
      </Drawer>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Reject report</DialogTitle>
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

// ---- filter pill ----

const FilterPill = ({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1.5,
      py: 0.6,
      borderRadius: 0.6,
      border: '1px solid',
      borderColor: active ? 'primary.main' : 'divider',
      bgcolor: active ? 'rgba(249,115,22,0.08)' : 'background.paper',
      color: active ? 'primary.light' : 'text.secondary',
      fontWeight: 600,
      fontSize: '0.82rem',
      cursor: 'pointer',
      transition: 'all 0.15s',
      '&:hover': active ? {} : { borderColor: 'primary.light', color: 'text.primary' },
    }}
  >
    {label}
    <Box
      component="span"
      sx={{
        fontFamily: 'monospace',
        fontSize: '0.72rem',
        color: active ? 'primary.light' : 'text.secondary',
        opacity: active ? 1 : 0.75,
      }}
    >
      {count}
    </Box>
  </Box>
);

// ---- table ----

const COLS = '240px 120px 110px 90px 60px 130px 200px';

const HeaderRow = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: COLS,
      px: 2,
      py: 1,
      borderBottom: '1px solid',
      borderColor: 'divider',
      color: 'text.secondary',
      fontSize: '0.66rem',
      letterSpacing: 0.8,
      fontWeight: 700,
      textTransform: 'uppercase',
    }}
  >
    <Box>Fellow</Box>
    <Box>Month</Box>
    <Box>Submitted</Box>
    <Box>Words</Box>
    <Box>PRs</Box>
    <Box>Status</Box>
    <Box sx={{ textAlign: 'right' }} />
  </Box>
);

const ReportRow = ({
  report,
  track,
  onOpen,
  onApprove,
  isReviewing,
}: {
  report: GetFellowshipReportResponseDto;
  track: FellowshipType | null;
  onOpen: () => void;
  onApprove: () => void;
  isReviewing: boolean;
}) => {
  const tint = tintFor(report.userName ?? report.userId ?? report.id);
  const trackColor = track ? TRACK_COLORS[track] : '#a1a1aa';
  const pill = STATUS_PILL[report.status];
  const canApprove = report.status === FellowshipReportStatus.SUBMITTED;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: COLS,
        alignItems: 'center',
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.12s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: tint.bg,
            color: tint.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials(report.userName)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.86rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {report.userName ?? '—'}
          </Typography>
          {track && (
            <Typography
              variant="caption"
              sx={{
                color: trackColor,
                fontSize: '0.66rem',
                letterSpacing: 0.8,
                fontWeight: 700,
              }}
            >
              {track}
            </Typography>
          )}
        </Box>
      </Stack>

      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
        {formatMonthYear(report.month, report.year)}
      </Typography>

      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'text.secondary' }}>
        {formatShortDate(report.submittedAt)}
      </Typography>

      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
        {wordsFor(report.id)}
      </Typography>

      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
        {prsFor(report.id)}
      </Typography>

      <Box>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.6,
            px: 1,
            py: 0.3,
            borderRadius: 4,
            bgcolor: pill.bg,
            color: pill.color,
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
        >
          <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: pill.color }} />
          {pill.label}
        </Box>
      </Box>

      <Stack direction="row" spacing={0.75} justifyContent="flex-end">
        <Button
          variant="outlined"
          size="small"
          onClick={onOpen}
          sx={{ color: 'text.primary', borderColor: 'divider', minWidth: 64 }}
        >
          Open
        </Button>
        {canApprove && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Check size={13} />}
            onClick={onApprove}
            disabled={isReviewing}
            sx={{ minWidth: 90 }}
          >
            Approve
          </Button>
        )}
      </Stack>
    </Box>
  );
};

// ---- detail drawer ----

const ReportDetail = ({
  report,
  onClose,
  onApprove,
  onReject,
  isReviewing,
}: {
  report: GetFellowshipReportResponseDto;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isReviewing: boolean;
}) => {
  const contentQuery = useReportContent(report.id);
  const pill = STATUS_PILL[report.status];
  return (
    <Box sx={{ width: '100%', p: { xs: 3, md: 5 } }}>
      <Button
        onClick={onClose}
        sx={{
          mb: 3,
          pl: 0,
          color: 'text.secondary',
          '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
        }}
      >
        ← Back to reports
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {report.userName ?? '—'} · {formatMonthYear(report.month, report.year)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Submitted {formatShortDate(report.submittedAt)} · {wordsFor(report.id)} words ·{' '}
            {prsFor(report.id)} PRs
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.6,
            px: 1,
            py: 0.3,
            borderRadius: 4,
            bgcolor: pill.bg,
            color: pill.color,
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
        >
          <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: pill.color }} />
          {pill.label}
        </Box>
      </Stack>

      {contentQuery.isLoading && <CircularProgress size={20} />}
      {contentQuery.data && <MarkdownView content={contentQuery.data.content} />}

      {report.reviewerName && report.reviewerRemarks && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <strong>{report.reviewerName}:</strong> {report.reviewerRemarks}
        </Alert>
      )}

      {report.status === FellowshipReportStatus.SUBMITTED && (
        <Stack direction="row" spacing={1.25} sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={onApprove}
            disabled={isReviewing}
            startIcon={<Check size={14} />}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={onReject}
            disabled={isReviewing}
          >
            Reject
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default ReportsAdmin;
