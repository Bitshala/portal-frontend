import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MoreHorizontal, Plus } from 'lucide-react';
import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import {
  useFellowships,
  useReports,
  useStartFellowshipContract,
} from '../../../hooks/fellowshipHooks';
import {
  FellowshipStatus,
  FellowshipType,
  type GetFellowshipResponseDto,
  type GetFellowshipReportResponseDto,
} from '../../../types/fellowship';
import { extractErrorMessage } from '../../../utils/errorUtils';

const PAGE_SIZE = 50;

type StatusFilter = 'ALL' | FellowshipStatus;

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

const STATUS_DOT: Record<FellowshipStatus, { color: string; label: string }> = {
  [FellowshipStatus.PENDING]: { color: '#fbbf24', label: 'Pending' },
  [FellowshipStatus.ACTIVE]: { color: '#4ade80', label: 'Active' },
  [FellowshipStatus.COMPLETED]: { color: '#60a5fa', label: 'Completed' },
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

const handleFor = (f: GetFellowshipResponseDto): string => {
  const gh = f.githubProfile;
  if (gh) {
    const m = gh.match(/github\.com\/([^/\s]+)/i);
    if (m) return `@${m[1]}`;
    if (gh.startsWith('@')) return gh;
  }
  if (f.userEmail) return `@${f.userEmail.split('@')[0]}`;
  return '—';
};

const totalMonths = (f: GetFellowshipResponseDto): number => {
  if (!f.startDate || !f.endDate) return 6;
  const start = new Date(f.startDate);
  const end = new Date(f.endDate);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
};

const elapsedMonths = (f: GetFellowshipResponseDto, now: Date): number => {
  if (!f.startDate || !f.endDate) return 0;
  const start = new Date(f.startDate);
  const elapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
  return Math.max(0, Math.min(elapsed, totalMonths(f)));
};

const monthShort = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });

const formatPayoutPerMonth = (amountUsd: string | null): string => {
  if (!amountUsd) return '—';
  const n = Number(amountUsd);
  if (Number.isNaN(n)) return amountUsd;
  return `$${n.toFixed(2)}/mo`;
};

// ---- page ----

const FellowshipsAdmin = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [contractFor, setContractFor] = useState<GetFellowshipResponseDto | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useFellowships({ page: 0, pageSize: PAGE_SIZE });
  const reportsQuery = useReports({ page: 0, pageSize: 200 });

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

  const filtered = useMemo(
    () => (filter === 'ALL' ? fellowships : fellowships.filter((f) => f.status === filter)),
    [fellowships, filter],
  );

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

  const firstPending = fellowships.find((f) => f.status === FellowshipStatus.PENDING) ?? null;

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

        <Button
          variant="contained"
          startIcon={<Plus size={14} />}
          disabled={!firstPending}
          onClick={() => firstPending && setContractFor(firstPending)}
        >
          New fellowship
        </Button>
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
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No fellowships match this filter.
            </Typography>
          </Box>
        ) : (
          filtered.map((f) => (
            <FellowshipRow
              key={f.id}
              fellowship={f}
              lastReport={lastReportByFellowship.get(f.id)}
              onOpen={() => navigate(`/fellowship/fellowships/${f.id}`)}
              onStartContract={() => setContractFor(f)}
            />
          ))
        )}
      </Box>

      <StartContractDialog
        fellowship={contractFor}
        onClose={() => setContractFor(null)}
        onSuccess={(msg) => {
          setToast({ kind: 'success', msg });
          setContractFor(null);
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

// ---- table header ----

const COLS = '220px 110px minmax(0, 1fr) 160px 110px 110px 110px 36px';

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
    <Box>Track</Box>
    <Box>Project</Box>
    <Box>Progress</Box>
    <Box>Payout</Box>
    <Box>Last report</Box>
    <Box>Status</Box>
    <Box />
  </Box>
);

// ---- row ----

const FellowshipRow = ({
  fellowship,
  lastReport,
  onOpen,
  onStartContract,
}: {
  fellowship: GetFellowshipResponseDto;
  lastReport?: GetFellowshipReportResponseDto;
  onOpen: () => void;
  onStartContract: () => void;
}) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const now = useMemo(() => new Date(), []);
  const total = totalMonths(fellowship);
  const elapsed = elapsedMonths(fellowship, now);
  const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
  const tint = tintFor(fellowship.userName ?? fellowship.userEmail ?? fellowship.id);
  const trackColor = TRACK_COLORS[fellowship.type];
  const dot = STATUS_DOT[fellowship.status];
  const isPending = fellowship.status === FellowshipStatus.PENDING;

  return (
    <Box
      onClick={onOpen}
      sx={{
        display: 'grid',
        gridTemplateColumns: COLS,
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
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.7rem' }}
          >
            {handleFor(fellowship)}
          </Typography>
        </Box>
      </Stack>

      {/* Track */}
      <Box
        sx={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: 0.8,
          color: trackColor,
        }}
      >
        {fellowship.type}
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
        {fellowship.projectName || (
          <Box component="span" sx={{ color: 'text.secondary' }}>
            Awaiting onboarding
          </Box>
        )}
      </Typography>

      {/* Progress */}
      <Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.secondary' }}>
            M{elapsed}/{total}
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.secondary' }}>
            {pct}%
          </Typography>
        </Stack>
        <Box
          sx={{
            height: 3,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${pct}%`,
              bgcolor: trackColor,
            }}
          />
        </Box>
      </Box>

      {/* Payout */}
      <Typography
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          color: 'text.primary',
        }}
      >
        {formatPayoutPerMonth(fellowship.amountUsd)}
      </Typography>

      {/* Last report */}
      <Typography
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          color: 'text.secondary',
        }}
      >
        {lastReport ? `${monthShort(lastReport.month)} ${lastReport.year}` : '—'}
      </Typography>

      {/* Status */}
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dot.color }} />
        <Typography sx={{ fontSize: '0.82rem', color: 'text.primary' }}>{dot.label}</Typography>
      </Stack>

      {/* Actions */}
      <Box onClick={(e) => e.stopPropagation()}>
        <IconButton
          size="small"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ color: 'text.secondary' }}
        >
          <MoreHorizontal size={16} />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={!!menuAnchor}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{
            sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' },
          }}
        >
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onOpen();
            }}
          >
            Open dashboard
          </MenuItem>
          {isPending && (
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                onStartContract();
              }}
            >
              Start contract
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Box>
  );
};

// ---- start contract dialog ----

const StartContractDialog = ({
  fellowship,
  onClose,
  onSuccess,
  onError,
}: {
  fellowship: GetFellowshipResponseDto | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amountUsd, setAmountUsd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const startMut = useStartFellowshipContract();

  const validate = () => {
    if (!startDate || !endDate || !amountUsd) return 'All fields required.';
    if (new Date(endDate) <= new Date(startDate)) return 'End date must be after start date.';
    const n = Number(amountUsd);
    if (Number.isNaN(n) || n <= 0) return 'Amount must be positive.';
    if (!/^\d+(\.\d{1,2})?$/.test(amountUsd)) return 'Amount supports up to 2 decimals.';
    return null;
  };

  const reset = () => {
    setStartDate('');
    setEndDate('');
    setAmountUsd('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!fellowship) return;
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    try {
      await startMut.mutateAsync({
        id: fellowship.id,
        body: { startDate, endDate, amountUsd: Number(amountUsd) },
      });
      onSuccess('Contract started.');
      reset();
    } catch (e) {
      onError(extractErrorMessage(e));
    }
  };

  return (
    <Dialog
      open={!!fellowship}
      onClose={() => {
        reset();
        onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Start contract — {fellowship?.userName ?? fellowship?.userEmail ?? 'Fellowship'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Start date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextField
              label="End date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Stack>
          <TextField
            label="Amount (USD, per month)"
            size="small"
            fullWidth
            value={amountUsd}
            onChange={(e) => setAmountUsd(e.target.value)}
            placeholder="500.00"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={startMut.isPending}>
          {startMut.isPending ? 'Starting…' : 'Start contract'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FellowshipsAdmin;
