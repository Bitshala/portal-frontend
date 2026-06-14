import { useEffect, useMemo, useState } from 'react';
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
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowDownUp, Check, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import MarkdownView from '../../../components/fellowship/MarkdownView';
import StatusChip from '../../../components/fellowship/StatusChip';
import { fontFamilyMono } from '../../../components/fellowship/theme';
import {
  useFellowships,
  useReportContent,
  useReports,
  useReviewReport,
} from '../../../hooks/fellowshipHooks';
import { useDebounce } from '../../../hooks/useDebounce';
import { useFellowshipProjectTitle } from '../../../hooks/useFellowshipProjectTitle';
import fellowshipService from '../../../services/fellowshipService';
import {
  FellowshipReportStatus,
  type FellowshipReportsSortBy,
  FellowshipType,
  type GetFellowshipReportResponseDto,
  type GetFellowshipResponseDto,
} from '../../../types/fellowship';
import { SortOrder } from '../../../types/api';
import { extractErrorMessage, isBadFilterError } from '../../../utils/errorUtils';
import { formatFellowshipType } from '../../../utils/fellowshipFormat';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

type StatusFilter = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ALL';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  // StatusChip renders SUBMITTED as "Under review" — keep the pill in sync.
  { label: 'Under review', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
];

const STATUS_PARAM: Record<StatusFilter, FellowshipReportStatus | undefined> = {
  SUBMITTED: FellowshipReportStatus.SUBMITTED,
  APPROVED: FellowshipReportStatus.APPROVED,
  REJECTED: FellowshipReportStatus.REJECTED,
  ALL: undefined,
};

// The server sorts reports by createdAt/updatedAt/period (year then month).
type SortKey = 'newest' | 'oldest' | 'period' | 'updated';

const SORT_OPTIONS: {
  label: string;
  value: SortKey;
  sortBy: FellowshipReportsSortBy;
  sortOrder: SortOrder;
}[] = [
  { label: 'Newest', value: 'newest', sortBy: 'createdAt', sortOrder: SortOrder.DESC },
  { label: 'Oldest', value: 'oldest', sortBy: 'createdAt', sortOrder: SortOrder.ASC },
  { label: 'Recent period', value: 'period', sortBy: 'period', sortOrder: SortOrder.DESC },
  { label: 'Recently updated', value: 'updated', sortBy: 'updatedAt', sortOrder: SortOrder.DESC },
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

const monthShort = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });

const formatMonthYear = (month: number, year: number) => `${monthShort(month)} ${year}`;
const formatShortDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

// ---- page ----

const ReportsAdmin = () => {
  const [filter, setFilter] = useState<StatusFilter>('SUBMITTED');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<GetFellowshipReportResponseDto | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const debouncedSearch = useDebounce(search.trim(), 300);
  const statusParam = STATUS_PARAM[filter];
  const sort = SORT_OPTIONS.find((o) => o.value === sortKey) ?? SORT_OPTIONS[0];

  useEffect(() => {
    setPage(0);
  }, [filter, debouncedSearch, sortKey, pageSize]);

  const { data, isLoading, isError, error } = useReports(
    {
      page,
      pageSize,
      ...(statusParam ? { status: statusParam } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder,
    },
    { placeholderData: (prev) => prev },
  );
  // Reports carry only fellowName; project/track are joined from fellowships.
  // NOTE: this lookup assumes ≤100 fellowships — revisit if that grows.
  const fellowshipsQuery = useFellowships({ page: 0, pageSize: 100 });
  const reviewMut = useReviewReport();

  // The server returns the page already filtered/searched/sorted.
  const records = useMemo(() => data?.records ?? [], [data?.records]);
  const totalRecords = data?.totalRecords ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRecords / pageSize));

  const fellowships = useMemo(
    () => fellowshipsQuery.data?.records ?? [],
    [fellowshipsQuery.data?.records],
  );
  const fellowshipById = useMemo(() => {
    const m = new Map<string, GetFellowshipResponseDto>();
    for (const f of fellowships) m.set(f.id, f);
    return m;
  }, [fellowships]);

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

  // Export covers the full filtered/searched result set, not just the page on
  // screen — so we walk every page from the server before building the CSV.
  const handleExport = async () => {
    setExporting(true);
    try {
      const [allReports, allFellowships] = await Promise.all([
        fellowshipService.fetchAllReports({
          ...(statusParam ? { status: statusParam } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          sortBy: sort.sortBy,
          sortOrder: sort.sortOrder,
        }),
        fellowshipService.fetchAllFellowships({}),
      ]);
      const byId = new Map<string, GetFellowshipResponseDto>();
      for (const f of allFellowships) byId.set(f.id, f);

      const header = ['fellow', 'track', 'project', 'month', 'submitted', 'status'];
      const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
      const rows = allReports.map((r) => {
        const f = byId.get(r.fellowshipId);
        return [
          csvCell(r.fellowName ?? ''),
          f?.type ?? '',
          csvCell(f?.projectName ?? ''),
          formatMonthYear(r.month, r.year),
          r.updatedAt ?? '',
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
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    } finally {
      setExporting(false);
    }
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

      {isError && (
        <Alert severity={isBadFilterError(error) ? 'warning' : 'error'} sx={{ mb: 2 }}>
          {isBadFilterError(error)
            ? `Invalid filter or search — please adjust and try again. (${extractErrorMessage(error)})`
            : `Couldn't load reports: ${extractErrorMessage(error)}`}
        </Alert>
      )}

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
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            />
          ))}
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{ flexGrow: { md: 1 }, maxWidth: { md: 860 } }}
        >
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fellow, project…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={14} />
                </InputAdornment>
              ),
            }}
            inputProps={{ maxLength: 100 }}
            sx={{ flexGrow: 1, minWidth: 240 }}
          />
          <SortMenu
            sortKey={sortKey}
            onSort={setSortKey}
            open={sortMenuOpen}
            setOpen={setSortMenuOpen}
          />
          <Button
            variant="outlined"
            startIcon={<Download size={14} />}
            onClick={handleExport}
            disabled={exporting || totalRecords === 0}
            sx={{ color: 'text.primary', borderColor: 'divider' }}
          >
            {exporting ? 'Exporting…' : 'Export'}
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
        ) : records.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No reports match these filters.
            </Typography>
          </Box>
        ) : (
          <>
            {records.map((r) => (
              <ReportRow
                key={r.id}
                report={r}
                fellowship={fellowshipById.get(r.fellowshipId)}
                onOpen={() => setSelected(r)}
              />
            ))}
            {totalRecords > 0 && (
              <PaginationFooter
                page={page}
                pageCount={pageCount}
                total={totalRecords}
                pageSize={pageSize}
                onChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </>
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
            fellowship={fellowshipById.get(selected.fellowshipId)}
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
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      px: 1.75,
      py: 0.6,
      borderRadius: 999,
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
  </Box>
);

// ---- sort menu ----

const SortMenu = ({
  sortKey,
  onSort,
  open,
  setOpen,
}: {
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}) => (
  <Box sx={{ position: 'relative' }}>
    <Button
      onClick={() => setOpen(!open)}
      startIcon={<ArrowDownUp size={14} />}
      variant="outlined"
      sx={{
        color: 'text.primary',
        borderColor: 'divider',
        fontWeight: 600,
        textTransform: 'none',
        fontSize: '0.82rem',
        whiteSpace: 'nowrap',
      }}
    >
      {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? 'Sort'}
    </Button>
    {open && (
      <Box
        sx={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          borderRadius: 0.6,
          p: 0.5,
          zIndex: 5,
          minWidth: 180,
        }}
      >
        {SORT_OPTIONS.map((o) => (
          <Box
            key={o.value}
            onClick={() => {
              onSort(o.value);
              setOpen(false);
            }}
            sx={{
              px: 1.25,
              py: 0.75,
              borderRadius: 0.4,
              fontSize: '0.85rem',
              cursor: 'pointer',
              bgcolor: sortKey === o.value ? 'rgba(249,115,22,0.08)' : 'transparent',
              color: sortKey === o.value ? 'primary.light' : 'text.primary',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
            }}
          >
            {o.label}
          </Box>
        ))}
      </Box>
    )}
  </Box>
);

// ---- pagination footer ----

const PaginationFooter = ({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) => {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 3, py: 1.25, borderTop: '1px solid', borderColor: 'divider' }}
    >
      <RowsPerPageSelect value={pageSize} onChange={onPageSizeChange} />
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography
          sx={{ fontFamily: fontFamilyMono, fontSize: '0.74rem', color: 'text.secondary' }}
        >
          {from}–{to} of {total}
        </Typography>
        <IconButton
          size="small"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          <ChevronLeft size={16} />
        </IconButton>
        <Typography
          sx={{ fontFamily: fontFamilyMono, fontSize: '0.74rem', color: 'text.secondary' }}
        >
          {page + 1} / {pageCount}
        </Typography>
        <IconButton
          size="small"
          aria-label="Next page"
          disabled={page >= pageCount - 1}
          onClick={() => onChange(page + 1)}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          <ChevronRight size={16} />
        </IconButton>
      </Stack>
    </Stack>
  );
};

// Compact "rows per page" picker for the table footer.
const RowsPerPageSelect = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (size: number) => void;
}) => (
  <Stack direction="row" spacing={0.75} alignItems="center">
    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Rows</Typography>
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      slotProps={{ htmlInput: { 'aria-label': 'Rows per page' } }}
      sx={{ '& .MuiSelect-select': { py: 0.25, pl: 1, fontSize: '0.74rem' } }}
    >
      {PAGE_SIZE_OPTIONS.map((n) => (
        <MenuItem key={n} value={n} sx={{ fontSize: '0.8rem' }}>
          {n}
        </MenuItem>
      ))}
    </TextField>
  </Stack>
);

// ---- table ----

const COLS =
  'minmax(200px, 1.8fr) minmax(150px, 1.4fr) minmax(100px, 0.9fr) minmax(100px, 0.9fr) minmax(120px, 1fr)';
const COL_GAP = 3;

const HeaderRow = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: COLS,
      columnGap: COL_GAP,
      px: 3,
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
    <Box>Fellow</Box>
    <Box>Project</Box>
    <Box>Month</Box>
    <Box>Submitted</Box>
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
  const tint = tintFor(report.fellowName ?? report.fellowshipId ?? report.id);
  const track = fellowship?.type ?? null;
  const trackColor = track ? TRACK_COLORS[track] : '#a1a1aa';
  const project = useFellowshipProjectTitle(fellowship) || null;

  return (
    <Box
      onClick={onOpen}
      sx={{
        display: 'grid',
        gridTemplateColumns: COLS,
        columnGap: COL_GAP,
        alignItems: 'center',
        px: 3,
        py: 1.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
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
          {initials(report.fellowName)}
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
            {report.fellowName ?? '—'}
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
              {formatFellowshipType(track)}
            </Typography>
          )}
        </Box>
      </Stack>

      <Typography
        sx={{
          fontSize: '0.82rem',
          color: project ? 'text.primary' : 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={project ?? undefined}
      >
        {project ?? '—'}
      </Typography>

      <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.82rem' }}>
        {formatMonthYear(report.month, report.year)}
      </Typography>

      <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.82rem', color: 'text.secondary' }}>
        {formatShortDate(report.updatedAt)}
      </Typography>

      <Box>
        <StatusChip status={report.status} />
      </Box>
    </Box>
  );
};

// ---- detail drawer ----

const ReportDetail = ({
  report,
  fellowship,
  onClose,
  onApprove,
  onReject,
  isReviewing,
}: {
  report: GetFellowshipReportResponseDto;
  fellowship?: GetFellowshipResponseDto;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isReviewing: boolean;
}) => {
  const contentQuery = useReportContent(report.id);
  const project = useFellowshipProjectTitle(fellowship) || null;
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
            {report.fellowName ?? '—'} · {formatMonthYear(report.month, report.year)}
          </Typography>
          {project && (
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {project}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Submitted {formatShortDate(report.updatedAt)}
          </Typography>
        </Box>
        <StatusChip status={report.status} size="medium" />
      </Stack>

      {contentQuery.isLoading && <CircularProgress size={20} />}
      {contentQuery.data && <MarkdownView content={contentQuery.data.content} />}

      {report.reviewedByName && report.reviewerRemarks && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <strong>{report.reviewedByName}:</strong> {report.reviewerRemarks}
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
