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
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  PlayCircle,
  Search,
} from 'lucide-react';
import DocumentList from '../../../components/fellowship/DocumentList';
import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import ProposalDialog from '../../../components/fellowship/ProposalDialog';
import StartContractDialog from '../../../components/fellowship/StartContractDialog';
import StatusChip from '../../../components/fellowship/StatusChip';
import { fontFamilyMono } from '../../../components/fellowship/theme';
import { useFellowshipDocuments, useFellowships } from '../../../hooks/fellowshipHooks';
import { useDebounce } from '../../../hooks/useDebounce';
import { useFellowshipProjectTitle } from '../../../hooks/useFellowshipProjectTitle';
import fellowshipService from '../../../services/fellowshipService';
import {
  type FellowshipsSortBy,
  FellowshipStatus,
  FellowshipType,
  type GetFellowshipReportResponseDto,
  type GetFellowshipResponseDto,
} from '../../../types/fellowship';
import { SortOrder } from '../../../types/api';
import { extractErrorMessage, isBadFilterError } from '../../../utils/errorUtils';
import { formatFellowshipType } from '../../../utils/fellowshipFormat';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

type StatusFilter = 'ALL' | FellowshipStatus;
// Sort columns are restricted to the server's whitelist — the old name/project
// sorts aren't supported server-side, so sorting now lives on the date/payout
// columns instead.
type SortKey = FellowshipsSortBy;

const ALL_VALUE = '__ALL__';

const STATUS_PARAM: Record<StatusFilter, FellowshipStatus | undefined> = {
  ALL: undefined,
  [FellowshipStatus.PENDING]: FellowshipStatus.PENDING,
  [FellowshipStatus.AWAITING_DOCUMENTS]: FellowshipStatus.AWAITING_DOCUMENTS,
  [FellowshipStatus.DOCUMENTS_IN_REVIEW]: FellowshipStatus.DOCUMENTS_IN_REVIEW,
  [FellowshipStatus.DOCUMENTS_APPROVED]: FellowshipStatus.DOCUMENTS_APPROVED,
  [FellowshipStatus.ACTIVE]: FellowshipStatus.ACTIVE,
  [FellowshipStatus.COMPLETED]: FellowshipStatus.COMPLETED,
};

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: FellowshipStatus.PENDING },
  { label: 'Awaiting docs', value: FellowshipStatus.AWAITING_DOCUMENTS },
  { label: 'Docs in review', value: FellowshipStatus.DOCUMENTS_IN_REVIEW },
  { label: 'Docs approved', value: FellowshipStatus.DOCUMENTS_APPROVED },
  { label: 'Active', value: FellowshipStatus.ACTIVE },
  { label: 'Completed', value: FellowshipStatus.COMPLETED },
];

// Fixed track options — no longer derived from the loaded page.
const TRACK_OPTIONS: FellowshipType[] = [
  FellowshipType.DEVELOPER,
  FellowshipType.DESIGNER,
  FellowshipType.EDUCATOR,
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

const handleFor = (f: GetFellowshipResponseDto): string | null => {
  const gh = f.githubProfile;
  if (gh) {
    const m = gh.match(/github\.com\/([^/\s]+)/i);
    if (m) return `@${m[1]}`;
    if (gh.startsWith('@')) return gh;
  }
  if (f.userEmail) return `@${f.userEmail.split('@')[0]}`;
  return null;
};

const monthShort = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });

const formatEndDate = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatPayoutPerMonth = (amountUsd: string | null): string => {
  if (!amountUsd) return '—';
  const n = Number(amountUsd);
  if (Number.isNaN(n)) return amountUsd;
  return `$${n.toFixed(2)}/mo`;
};

// ---- page ----

const FellowshipsAdmin = () => {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState<string>(ALL_VALUE);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortOrder>(SortOrder.DESC);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [exporting, setExporting] = useState(false);
  // Fellowship whose proposal is open in the viewer dialog (Start contract is
  // offered from inside that dialog once documents are approved).
  const [proposalFellowship, setProposalFellowship] = useState<GetFellowshipResponseDto | null>(null);
  // Fellowship whose "Start contract" dialog is open (admin-only action).
  const [contractFellowship, setContractFellowship] = useState<GetFellowshipResponseDto | null>(null);
  // Fellowship whose document-review dialog is open (download + approve/reject).
  const [documentsFellowship, setDocumentsFellowship] = useState<GetFellowshipResponseDto | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const debouncedSearch = useDebounce(search.trim(), 300);
  const statusParam = STATUS_PARAM[filter];
  const typeParam = trackFilter === ALL_VALUE ? undefined : (trackFilter as FellowshipType);

  useEffect(() => {
    setPage(0);
  }, [filter, debouncedSearch, trackFilter, sortKey, sortDir, pageSize]);

  const { data, isLoading, isError, error } = useFellowships(
    {
      page,
      pageSize,
      ...(statusParam ? { status: statusParam } : {}),
      ...(typeParam ? { type: typeParam } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      sortBy: sortKey,
      sortOrder: sortDir,
    },
    { placeholderData: (prev) => prev },
  );

  // The server returns the page already filtered/searched/sorted (nulls last).
  const fellowships = useMemo(() => data?.records ?? [], [data?.records]);
  const totalRecords = data?.totalRecords ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRecords / pageSize));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC));
    } else {
      setSortKey(key);
      setSortDir(SortOrder.DESC);
    }
  };

  // Export covers the full filtered result set. The "last report" column needs
  // every fellow's reports, so we pull all reports too and index them locally.
  const handleExport = async () => {
    setExporting(true);
    try {
      const [allFellowships, allReports] = await Promise.all([
        fellowshipService.fetchAllFellowships({
          ...(statusParam ? { status: statusParam } : {}),
          ...(typeParam ? { type: typeParam } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          sortBy: sortKey,
          sortOrder: sortDir,
        }),
        fellowshipService.fetchAllReports({}),
      ]);

      const lastReportByFellowship = new Map<string, GetFellowshipReportResponseDto>();
      for (const r of allReports) {
        const cur = lastReportByFellowship.get(r.fellowshipId);
        // most recent year/month wins
        if (!cur || r.year > cur.year || (r.year === cur.year && r.month > cur.month)) {
          lastReportByFellowship.set(r.fellowshipId, r);
        }
      }

      const header = [
        'fellow',
        'track',
        'project',
        'maintainer',
        'end_date',
        'payout',
        'last_report',
        'status',
      ];
      const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
      const rows = allFellowships.map((f) => {
        const last = lastReportByFellowship.get(f.id);
        return [
          csvCell(f.userName ?? ''),
          f.type,
          csvCell(f.projectName ?? ''),
          csvCell(f.projectMaintainerName ?? ''),
          f.endDate ?? '',
          formatPayoutPerMonth(f.amountUsd),
          last ? `${monthShort(last.month)} ${last.year}` : '',
          f.status,
        ].join(',');
      });
      const csv = [header.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fellowships-${new Date().toISOString().slice(0, 10)}.csv`;
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
      title="Fellowships"
      subtitle="Manage active fellowships and start contracts."
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
            : `Couldn't load fellowships: ${extractErrorMessage(error)}`}
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{ mt: 1.5, mb: 2 }}
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
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ flexGrow: { md: 1 }, maxWidth: { md: 860 } }}
        >
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fellow, project…"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={14} />
                  </InputAdornment>
                ),
              },
              htmlInput: { maxLength: 100 },
            }}
            sx={{ flexGrow: 1, minWidth: 220 }}
          />
          <TextField
            select
            size="small"
            label="Track"
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value={ALL_VALUE}>All tracks</MenuItem>
            {TRACK_OPTIONS.map((t) => (
              <MenuItem key={t} value={t}>
                {formatFellowshipType(t)}
              </MenuItem>
            ))}
          </TextField>
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
        <HeaderRow sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={22} />
          </Box>
        ) : fellowships.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No fellowships match these filters.
            </Typography>
          </Box>
        ) : (
          <>
            {fellowships.map((f) => (
              <FellowshipRow
                key={f.id}
                fellowship={f}
                onOpen={() => setProposalFellowship(f)}
                onViewProposal={() => setProposalFellowship(f)}
                onReviewDocuments={() => setDocumentsFellowship(f)}
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

      <ProposalDialog
        applicationId={proposalFellowship?.applicationId ?? null}
        onClose={() => setProposalFellowship(null)}
        actions={
          proposalFellowship?.status === FellowshipStatus.DOCUMENTS_APPROVED ? (
            <Button
              variant="contained"
              startIcon={<PlayCircle size={15} />}
              onClick={() => {
                setContractFellowship(proposalFellowship);
                setProposalFellowship(null);
              }}
            >
              Start contract
            </Button>
          ) : null
        }
      />

      <StartContractDialog
        fellowship={contractFellowship}
        onClose={() => setContractFellowship(null)}
        onSuccess={(msg) => {
          setToast({ kind: 'success', msg });
          setContractFellowship(null);
        }}
        onError={(msg) => setToast({ kind: 'error', msg })}
      />

      <FellowshipDocumentsDialog
        fellowship={documentsFellowship}
        onClose={() => setDocumentsFellowship(null)}
        onNotify={(kind, msg) => setToast({ kind, msg })}
      />
    </FellowshipPageLayout>
  );
};

// Admin document-review dialog: lists the fellowship's documents and lets the
// reviewer download each and approve/reject the fellow-uploaded ones. Reuses
// the shared DocumentList in admin mode.
const FellowshipDocumentsDialog = ({
  fellowship,
  onClose,
  onNotify,
}: {
  fellowship: GetFellowshipResponseDto | null;
  onClose: () => void;
  onNotify: (kind: 'success' | 'error', msg: string) => void;
}) => {
  const { data, isLoading, isError, error } = useFellowshipDocuments(
    fellowship?.id ?? '',
    { enabled: !!fellowship },
  );

  return (
    <Dialog open={!!fellowship} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        Documents — {fellowship?.userName ?? fellowship?.userEmail ?? 'Fellowship'}
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : isError ? (
          <Alert severity="error">
            {`Couldn't load documents: ${extractErrorMessage(error)}`}
          </Alert>
        ) : fellowship && data ? (
          data.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
              No documents for this fellowship yet.
            </Typography>
          ) : (
            <Box sx={{ pt: 1 }}>
              <DocumentList
                fellowshipId={fellowship.id}
                documents={data}
                mode="admin"
                onNotify={onNotify}
              />
            </Box>
          )
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
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

// ---- table header ----

// Proportional columns so the row fills the width evenly instead of dumping all
// slack into Project. Order: Fellow, Track, Project, End date, Payout, Status, Actions.
const COLS =
  'minmax(180px, 1.6fr) minmax(90px, 0.7fr) minmax(160px, 2fr) minmax(110px, 1fr) minmax(90px, 0.9fr) minmax(100px, 0.9fr) 200px';
const COL_GAP = 2;

const SortableHeader = ({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortOrder;
  onClick: () => void;
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.4,
      cursor: 'pointer',
      userSelect: 'none',
      color: active ? 'primary.light' : 'inherit',
      '&:hover': { color: 'text.primary' },
    }}
  >
    {label}
    {active &&
      (dir === SortOrder.ASC ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
  </Box>
);

const HeaderRow = ({
  sortKey,
  sortDir,
  onSort,
}: {
  sortKey: SortKey;
  sortDir: SortOrder;
  onSort: (key: SortKey) => void;
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: COLS,
      columnGap: COL_GAP,
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
    {/* Fellow and Project aren't in the server sort whitelist, so they're plain
        headers now — sorting lives on the End date and Payout columns. */}
    <Box>Fellow</Box>
    <Box>Track</Box>
    <Box>Project</Box>
    <SortableHeader
      label="End date"
      active={sortKey === 'endDate'}
      dir={sortDir}
      onClick={() => onSort('endDate')}
    />
    <SortableHeader
      label="Payout"
      active={sortKey === 'amountUsd'}
      dir={sortDir}
      onClick={() => onSort('amountUsd')}
    />
    <Box>Status</Box>
    <Box>Actions</Box>
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
      sx={{ px: 2, py: 1 }}
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

// ---- row ----

// The documents action is status-aware: an admin only needs to act while the
// fellowship is DOCUMENTS_IN_REVIEW (both documents uploaded, awaiting review).
// In every other state the button just opens the documents dialog to view them.
const docsAction = (status: FellowshipStatus): { label: string; emphasis: boolean } =>
  status === FellowshipStatus.DOCUMENTS_IN_REVIEW
    ? { label: 'Review docs', emphasis: true }
    : { label: 'View docs', emphasis: false };

// Compact, labeled row action. `emphasis` gives it the orange call-to-action
// treatment (matching the active filter pill) shown when the admin needs to
// act; otherwise it's a quiet secondary button.
const RowActionButton = ({
  label,
  emphasis = false,
  onClick,
}: {
  label: string;
  emphasis?: boolean;
  onClick: () => void;
}) => (
  <Button
    size="small"
    variant="outlined"
    color={emphasis ? 'primary' : 'inherit'}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    sx={{
      minWidth: 0,
      px: 1.25,
      py: 0.4,
      fontSize: '0.75rem',
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      ...(emphasis
        ? {
            color: 'primary.light',
            borderColor: 'rgba(249,115,22,0.5)',
            bgcolor: 'rgba(249,115,22,0.08)',
            '&:hover': { bgcolor: 'rgba(249,115,22,0.16)', borderColor: 'primary.main' },
          }
        : {
            color: 'text.secondary',
            borderColor: 'rgba(255,255,255,0.23)',
            '&:hover': {
              color: 'text.primary',
              borderColor: 'rgba(255,255,255,0.4)',
              bgcolor: 'rgba(255,255,255,0.06)',
            },
          }),
    }}
  >
    {label}
  </Button>
);

const FellowshipRow = ({
  fellowship,
  onOpen,
  onViewProposal,
  onReviewDocuments,
}: {
  fellowship: GetFellowshipResponseDto;
  onOpen: () => void;
  onViewProposal: () => void;
  onReviewDocuments: () => void;
}) => {
  const tint = tintFor(fellowship.userName ?? fellowship.userEmail ?? fellowship.id);
  const trackColor = TRACK_COLORS[fellowship.type];
  const projectTitle = useFellowshipProjectTitle(fellowship);
  const docs = docsAction(fellowship.status);

  return (
    <Box
      onClick={onOpen}
      sx={{
        display: 'grid',
        gridTemplateColumns: COLS,
        columnGap: COL_GAP,
        alignItems: 'center',
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'background-color 0.12s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      {/* Fellow */}
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
          {initials(fellowship.userName)}
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
            {fellowship.userName ?? '—'}
          </Typography>
          {handleFor(fellowship) && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontFamily: fontFamilyMono, fontSize: '0.7rem' }}
            >
              {handleFor(fellowship)}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Track */}
      <Box
        sx={{
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: 0.4,
          color: trackColor,
        }}
      >
        {formatFellowshipType(fellowship.type)}
      </Box>

      {/* Project */}
      <Typography
        sx={{
          fontSize: '0.86rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pr: 1,
        }}
      >
        {projectTitle || (
          <Box component="span" sx={{ color: 'text.secondary' }}>
            Project title not provided
          </Box>
        )}
      </Typography>

      {/* End date */}
      <Typography
        sx={{
          fontFamily: fontFamilyMono,
          fontSize: '0.78rem',
          color: fellowship.endDate ? 'text.primary' : 'text.secondary',
        }}
      >
        {formatEndDate(fellowship.endDate)}
      </Typography>

      {/* Payout */}
      <Typography
        sx={{
          fontFamily: fontFamilyMono,
          fontSize: '0.78rem',
          color: 'text.primary',
        }}
      >
        {formatPayoutPerMonth(fellowship.amountUsd)}
      </Typography>

      {/* Status */}
      <Box>
        <StatusChip status={fellowship.status} />
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={0.75} alignItems="center">
        <RowActionButton label={docs.label} emphasis={docs.emphasis} onClick={onReviewDocuments} />
        <RowActionButton label="Proposal" onClick={onViewProposal} />
      </Stack>
    </Box>
  );
};

export default FellowshipsAdmin;
