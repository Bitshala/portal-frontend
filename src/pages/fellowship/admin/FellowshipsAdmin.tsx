import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
  FileText,
  PlayCircle,
  Search,
} from 'lucide-react';
import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import ProposalDialog from '../../../components/fellowship/ProposalDialog';
import StartContractDialog from '../../../components/fellowship/StartContractDialog';
import StatusChip from '../../../components/fellowship/StatusChip';
import { fontFamilyMono } from '../../../components/fellowship/theme';
import { useFellowships, useReports } from '../../../hooks/fellowshipHooks';
import { useFellowshipProjectTitle } from '../../../hooks/useFellowshipProjectTitle';
import {
  FellowshipStatus,
  FellowshipType,
  type GetFellowshipResponseDto,
  type GetFellowshipReportResponseDto,
} from '../../../types/fellowship';
import { formatFellowshipType } from '../../../utils/fellowshipFormat';

// Filtering/search/sort happen client-side, so fetch a full page from the API
// and paginate the table locally. Capped at 100 — the backend rejects larger
// pageSize values with a 400.
const FETCH_PAGE_SIZE = 100;
const ROWS_PER_PAGE = 25;

type StatusFilter = 'ALL' | FellowshipStatus;
type SortKey = 'name' | 'project';
type SortDir = 'asc' | 'desc';

const ALL_VALUE = '__ALL__';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: FellowshipStatus.PENDING },
  { label: 'Active', value: FellowshipStatus.ACTIVE },
  { label: 'Completed', value: FellowshipStatus.COMPLETED },
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
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  // Fellowship whose proposal is open in the viewer dialog (Start contract is
  // offered from inside that dialog for PENDING fellowships).
  const [proposalFellowship, setProposalFellowship] = useState<GetFellowshipResponseDto | null>(null);
  // Fellowship whose "Start contract" dialog is open (admin-only action).
  const [contractFellowship, setContractFellowship] = useState<GetFellowshipResponseDto | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useFellowships({ page: 0, pageSize: FETCH_PAGE_SIZE });
  const reportsQuery = useReports({ page: 0, pageSize: 100 });

  const fellowships = useMemo(() => data?.records ?? [], [data?.records]);
  const reports = useMemo(() => reportsQuery.data?.records ?? [], [reportsQuery.data?.records]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      ALL: fellowships.length,
      [FellowshipStatus.PENDING]: 0,
      [FellowshipStatus.ACTIVE]: 0,
      [FellowshipStatus.COMPLETED]: 0,
    };
    for (const f of fellowships) c[f.status] += 1;
    return c;
  }, [fellowships]);

  const trackOptions = useMemo(() => {
    const s = new Set<FellowshipType>();
    for (const f of fellowships) s.add(f.type);
    return Array.from(s).sort((a, b) =>
      formatFellowshipType(a).localeCompare(formatFellowshipType(b)),
    );
  }, [fellowships]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fellowships.filter((f) => {
      if (filter !== 'ALL' && f.status !== filter) return false;
      if (trackFilter !== ALL_VALUE && f.type !== trackFilter) return false;
      if (q) {
        const haystack = [
          f.userName ?? '',
          f.projectName ?? '',
          f.projectMaintainerName ?? '',
          handleFor(f) ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [fellowships, filter, search, trackFilter]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const keyOf = (f: GetFellowshipResponseDto) =>
      (sortKey === 'name' ? f.userName : f.projectName)?.toLowerCase() ?? '';
    return [...filtered].sort((a, b) => {
      const ka = keyOf(a);
      const kb = keyOf(b);
      // push blanks to the bottom regardless of direction
      if (!ka && kb) return 1;
      if (ka && !kb) return -1;
      return ka.localeCompare(kb) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  useEffect(() => {
    setPage(0);
  }, [filter, search, trackFilter]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => sorted.slice(safePage * ROWS_PER_PAGE, (safePage + 1) * ROWS_PER_PAGE),
    [sorted, safePage],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleExport = () => {
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
    const rows = sorted.map((f) => {
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
  };

  const lastReportByFellowship = useMemo(() => {
    const map = new Map<string, GetFellowshipReportResponseDto>();
    for (const r of reports) {
      const cur = map.get(r.fellowshipId);
      if (!cur) {
        map.set(r.fellowshipId, r);
        continue;
      }
      // most recent year/month wins
      if (r.year > cur.year || (r.year === cur.year && r.month > cur.month)) {
        map.set(r.fellowshipId, r);
      }
    }
    return map;
  }, [reports]);

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
              count={counts[f.value]}
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            />
          ))}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
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
            }}
            sx={{ minWidth: 220 }}
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
            {trackOptions.map((t) => (
              <MenuItem key={t} value={t}>
                {formatFellowshipType(t)}
              </MenuItem>
            ))}
          </TextField>
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
        <HeaderRow sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={22} />
          </Box>
        ) : sorted.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No fellowships match these filters.
            </Typography>
          </Box>
        ) : (
          <>
            {pageRows.map((f) => (
              <FellowshipRow
                key={f.id}
                fellowship={f}
                onOpen={() => setProposalFellowship(f)}
                onViewProposal={() => setProposalFellowship(f)}
              />
            ))}
            {sorted.length > ROWS_PER_PAGE && (
              <PaginationFooter
                page={safePage}
                pageCount={pageCount}
                total={sorted.length}
                onChange={setPage}
              />
            )}
          </>
        )}
      </Box>

      <ProposalDialog
        applicationId={proposalFellowship?.applicationId ?? null}
        onClose={() => setProposalFellowship(null)}
        actions={
          proposalFellowship?.status === FellowshipStatus.PENDING ? (
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
    <Box
      component="span"
      sx={{
        fontFamily: fontFamilyMono,
        fontSize: '0.72rem',
        color: active ? 'primary.light' : 'text.secondary',
        opacity: active ? 1 : 0.75,
      }}
    >
      {count}
    </Box>
  </Box>
);

// ---- table header ----

// Proportional columns so the row fills the width evenly instead of dumping all
// slack into Project. Order: Fellow, Track, Project, End date, Payout, Status, Actions.
const COLS =
  'minmax(180px, 1.6fr) minmax(90px, 0.7fr) minmax(160px, 2fr) minmax(110px, 1fr) minmax(90px, 0.9fr) minmax(100px, 0.9fr) 56px';
const COL_GAP = 2;

const SortableHeader = ({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
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
      (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
  </Box>
);

const HeaderRow = ({
  sortKey,
  sortDir,
  onSort,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
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
    <SortableHeader
      label="Fellow"
      active={sortKey === 'name'}
      dir={sortDir}
      onClick={() => onSort('name')}
    />
    <Box>Track</Box>
    <SortableHeader
      label="Project"
      active={sortKey === 'project'}
      dir={sortDir}
      onClick={() => onSort('project')}
    />
    <Box>End date</Box>
    <Box>Payout</Box>
    <Box>Status</Box>
    <Box>Actions</Box>
  </Box>
);

// ---- pagination footer ----

const PaginationFooter = ({
  page,
  pageCount,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  onChange: (page: number) => void;
}) => {
  const from = page * ROWS_PER_PAGE + 1;
  const to = Math.min((page + 1) * ROWS_PER_PAGE, total);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 2, py: 1 }}
    >
      <Typography
        sx={{ fontFamily: fontFamilyMono, fontSize: '0.74rem', color: 'text.secondary' }}
      >
        {from}–{to} of {total}
      </Typography>
      <Stack direction="row" spacing={0.5} alignItems="center">
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

// ---- row ----

const FellowshipRow = ({
  fellowship,
  onOpen,
  onViewProposal,
}: {
  fellowship: GetFellowshipResponseDto;
  onOpen: () => void;
  onViewProposal: () => void;
}) => {
  const tint = tintFor(fellowship.userName ?? fellowship.userEmail ?? fellowship.id);
  const trackColor = TRACK_COLORS[fellowship.type];
  const projectTitle = useFellowshipProjectTitle(fellowship);

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
      <IconButton
        size="small"
        title="View proposal"
        aria-label="View proposal"
        onClick={(e) => {
          e.stopPropagation();
          onViewProposal();
        }}
        sx={{
          color: 'text.secondary',
          width: 28,
          height: 28,
          '&:hover': { color: 'text.primary' },
        }}
      >
        <FileText size={14} />
      </IconButton>
    </Box>
  );
};

export default FellowshipsAdmin;
