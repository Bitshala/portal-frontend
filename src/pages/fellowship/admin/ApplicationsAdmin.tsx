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
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Check,
  FileDown,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import ProposalView from '../../../components/fellowship/ProposalView';
import StatusChip from '../../../components/fellowship/StatusChip';
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
import { formatFellowshipType } from '../../../utils/fellowshipFormat';
import { normalizeGithub, parseProposal } from '../../../utils/proposalFormat';

const PAGE_SIZE = 50;

type FilterValue =
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'ALL';

// "Submitted" and the old reviewer-assigned "In review" state collapse into a
// single applicant-facing "Under review" bucket.
const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'Under review', value: 'SUBMITTED' },
  { label: 'Changes requested', value: 'CHANGES_REQUESTED' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
];

type SortKey = 'recent' | 'name';

// ---- helpers ----

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const initials = (name: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_TINTS: { bg: string; color: string }[] = [
  { bg: 'rgba(249,115,22,0.15)', color: '#fb923c' },
  { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  { bg: 'rgba(244,114,182,0.15)', color: '#f472b6' },
  { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
];

const tintFor = (seed: string) => AVATAR_TINTS[hash(seed) % AVATAR_TINTS.length];

const relativeDays = (iso: string | null): string => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (d <= 0) return 'today';
  if (d === 1) return '1d ago';
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return mo === 1 ? '1mo ago' : `${mo}mo ago`;
};

// ---- page ----

const ApplicationsAdmin = () => {
  const [filter, setFilter] = useState<FilterValue>('SUBMITTED');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [requestChangesOpen, setRequestChangesOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const apiStatus =
    filter === 'ALL'
      ? undefined
      : filter === 'SUBMITTED'
        ? FellowshipApplicationStatus.SUBMITTED
        : filter === 'CHANGES_REQUESTED'
          ? FellowshipApplicationStatus.CHANGES_REQUESTED
          : filter === 'ACCEPTED'
            ? FellowshipApplicationStatus.ACCEPTED
            : FellowshipApplicationStatus.REJECTED;

  const { data, isLoading, isError, error } = useApplications({
    page: 0,
    pageSize: PAGE_SIZE,
    ...(apiStatus ? { status: apiStatus } : {}),
  });
  const reviewMut = useReviewApplication();

  const allRecords = useMemo(() => data?.records ?? [], [data?.records]);

  // Client-side free-text search on top of the API status filter.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRecords;
    return allRecords.filter((r) =>
      (r.applicantName ?? '').toLowerCase().includes(q),
    );
  }, [allRecords, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortKey === 'name') {
      arr.sort((a, b) =>
        (a.applicantName ?? '').localeCompare(b.applicantName ?? ''),
      );
    } else {
      arr.sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return tb - ta;
      });
    }
    return arr;
  }, [filtered, sortKey]);

  const selectedIdx = sorted.findIndex((r) => r.id === selectedId);
  const selected = selectedIdx >= 0 ? sorted[selectedIdx] : sorted[0] ?? null;
  const effectiveSelectedId = selected?.id ?? null;

  const proposalQuery = useApplicationProposal(effectiveSelectedId ?? '', {
    enabled: !!effectiveSelectedId,
  });

  const handleAccept = async () => {
    if (!selected || !isDriveFolderUrl(driveUrl)) return;
    try {
      await reviewMut.mutateAsync({
        id: selected.id,
        body: {
          status: FellowshipApplicationStatus.ACCEPTED,
          driveFolderUrl: driveUrl.trim(),
        },
      });
      setToast({ kind: 'success', msg: 'Accepted — fellowship created in PENDING.' });
      setAcceptOpen(false);
      setDriveUrl('');
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
          status: FellowshipApplicationStatus.REJECTED,
          reviewerRemarks: remarks.trim(),
        },
      });
      setToast({ kind: 'success', msg: 'Application rejected.' });
      setRejectOpen(false);
      setRemarks('');
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleRequestChanges = async () => {
    if (!selected || !remarks.trim()) return;
    try {
      await reviewMut.mutateAsync({
        id: selected.id,
        body: {
          status: FellowshipApplicationStatus.CHANGES_REQUESTED,
          reviewerRemarks: remarks.trim(),
        },
      });
      setToast({ kind: 'success', msg: 'Changes requested — applicant notified.' });
      setRequestChangesOpen(false);
      setRemarks('');
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const goPrev = () => {
    if (selectedIdx > 0) setSelectedId(sorted[selectedIdx - 1].id);
  };
  const goNext = () => {
    if (selectedIdx >= 0 && selectedIdx < sorted.length - 1) {
      setSelectedId(sorted[selectedIdx + 1].id);
    }
  };

  return (
    <FellowshipPageLayout
      title="Applications"
      subtitle="Review submitted fellowship applications."
      hideIcon
    >
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Couldn't load applications: {extractErrorMessage(error)}
        </Alert>
      )}

      <Toolbar
        filter={filter}
        onFilter={setFilter}
        search={search}
        onSearch={setSearch}
        sortKey={sortKey}
        onSort={setSortKey}
        sortMenuOpen={sortMenuOpen}
        setSortMenuOpen={setSortMenuOpen}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 380px) minmax(0, 1fr)' },
          gap: 2,
          mt: 2,
        }}
      >
        <ApplicantList
          isLoading={isLoading}
          records={sorted}
          selectedId={effectiveSelectedId}
          onSelect={setSelectedId}
          sortKey={sortKey}
        />

        {selected ? (
          <DetailPane
            app={selected}
            proposal={proposalQuery.data?.proposal ?? ''}
            isLoadingProposal={proposalQuery.isLoading}
            position={selectedIdx >= 0 ? selectedIdx + 1 : 1}
            total={sorted.length}
            onPrev={goPrev}
            onNext={goNext}
            canPrev={selectedIdx > 0}
            canNext={selectedIdx >= 0 && selectedIdx < sorted.length - 1}
            onAccept={() => {
              setDriveUrl('');
              setAcceptOpen(true);
            }}
            onReject={() => {
              setRemarks('');
              setRejectOpen(true);
            }}
            onRequestChanges={() => {
              setRemarks('');
              setRequestChangesOpen(true);
            }}
            isReviewing={reviewMut.isPending}
          />
        ) : (
          <EmptyDetail />
        )}
      </Box>

      <RemarksDialog
        open={rejectOpen}
        title="Reject application"
        helper="Share feedback — this will be shown to the applicant."
        confirmLabel="Reject"
        confirmColor="error"
        value={remarks}
        onChange={setRemarks}
        onCancel={() => {
          setRejectOpen(false);
          setRemarks('');
        }}
        onConfirm={handleReject}
        busy={reviewMut.isPending}
      />

      <RemarksDialog
        open={requestChangesOpen}
        title="Request changes"
        helper="Tell the applicant what to revise. They'll be notified with these notes."
        confirmLabel="Send"
        confirmColor="warning"
        value={remarks}
        onChange={setRemarks}
        onCancel={() => {
          setRequestChangesOpen(false);
          setRemarks('');
        }}
        onConfirm={handleRequestChanges}
        busy={reviewMut.isPending}
      />

      <AcceptDialog
        open={acceptOpen}
        value={driveUrl}
        onChange={setDriveUrl}
        onCancel={() => {
          setAcceptOpen(false);
          setDriveUrl('');
        }}
        onConfirm={handleAccept}
        busy={reviewMut.isPending}
      />
    </FellowshipPageLayout>
  );
};

// ---- toolbar ----

const Toolbar = ({
  filter,
  onFilter,
  search,
  onSearch,
  sortKey,
  onSort,
  sortMenuOpen,
  setSortMenuOpen,
}: {
  filter: FilterValue;
  onFilter: (v: FilterValue) => void;
  search: string;
  onSearch: (v: string) => void;
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
  sortMenuOpen: boolean;
  setSortMenuOpen: (open: boolean) => void;
}) => (
  <Stack
    direction={{ xs: 'column', md: 'row' }}
    justifyContent="space-between"
    alignItems={{ xs: 'stretch', md: 'center' }}
    spacing={1.5}
  >
    <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ rowGap: 1 }}>
      {FILTERS.map((f) => {
        const active = filter === f.value;
        return (
          <Box
            key={f.value}
            onClick={() => onFilter(f.value)}
            sx={{
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
            {f.label}
          </Box>
        );
      })}
    </Stack>

    <Stack direction="row" spacing={1} alignItems="center">
      <TextField
        size="small"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search name, project…"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={14} />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 240 }}
      />
      <Box sx={{ position: 'relative' }}>
        <Button
          onClick={() => setSortMenuOpen(!sortMenuOpen)}
          startIcon={<ArrowDownUp size={14} />}
          variant="outlined"
          sx={{
            color: 'text.primary',
            borderColor: 'divider',
            fontWeight: 600,
            textTransform: 'capitalize',
            fontSize: '0.82rem',
          }}
        >
          {sortKey === 'recent' ? 'Recent' : 'Name'}
        </Button>
        {sortMenuOpen && (
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
              minWidth: 140,
            }}
          >
            {(['recent', 'name'] as SortKey[]).map((k) => (
              <Box
                key={k}
                onClick={() => {
                  onSort(k);
                  setSortMenuOpen(false);
                }}
                sx={{
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 0.4,
                  fontSize: '0.85rem',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  bgcolor: sortKey === k ? 'rgba(249,115,22,0.08)' : 'transparent',
                  color: sortKey === k ? 'primary.light' : 'text.primary',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                }}
              >
                Sort by {k}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Stack>
  </Stack>
);

// ---- applicant list ----

const ApplicantList = ({
  isLoading,
  records,
  selectedId,
  onSelect,
  sortKey,
}: {
  isLoading: boolean;
  records: GetFellowshipApplicationResponseDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sortKey: SortKey;
}) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 0.75,
      bgcolor: 'background.paper',
      p: 1.25,
      maxHeight: '74vh',
      overflowY: 'auto',
    }}
  >
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        letterSpacing: 0.6,
        fontSize: '0.72rem',
        px: 1,
        display: 'block',
        mb: 0.75,
      }}
    >
      {isLoading
        ? 'Loading…'
        : `${records.length} result${records.length === 1 ? '' : 's'} · sort by ${sortKey}`}
    </Typography>

    {isLoading && (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={20} />
      </Box>
    )}

    <Stack spacing={0.5}>
      {records.map((r) => {
        const isActive = r.id === selectedId;
        const tint = tintFor(r.applicantName ?? r.id);
        return (
          <Box
            key={r.id}
            onClick={() => onSelect(r.id)}
            sx={{
              p: 1.25,
              borderRadius: 0.5,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: isActive ? 'primary.main' : 'transparent',
              bgcolor: isActive ? 'rgba(249,115,22,0.06)' : 'transparent',
              transition: 'all 0.12s',
              '&:hover': isActive
                ? {}
                : { bgcolor: 'rgba(255,255,255,0.03)', borderColor: 'divider' },
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: tint.bg,
                  color: tint.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials(r.applicantName)}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.applicantName ?? '—'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.74rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {formatFellowshipType(r.type)} fellowship · {relativeDays(r.createdAt)}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                  <StatusChip status={r.status} />
                </Stack>
              </Box>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  </Box>
);

// ---- detail pane ----

const EmptyDetail = () => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 0.75,
      bgcolor: 'background.paper',
      p: 6,
      textAlign: 'center',
    }}
  >
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      Select an application from the list to review.
    </Typography>
  </Box>
);

const DetailPane = ({
  app,
  proposal,
  isLoadingProposal,
  position,
  total,
  onPrev,
  onNext,
  canPrev,
  canNext,
  onAccept,
  onReject,
  onRequestChanges,
  isReviewing,
}: {
  app: GetFellowshipApplicationResponseDto;
  proposal: string;
  isLoadingProposal: boolean;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  onAccept: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
  isReviewing: boolean;
}) => {
  const fields = useMemo(() => parseProposal(proposal), [proposal]);
  const handle = fields.github ? `@${normalizeGithub(fields.github)}` : '';
  const isFinal =
    app.status === FellowshipApplicationStatus.ACCEPTED ||
    app.status === FellowshipApplicationStatus.REJECTED;
  const awaitingApplicant = app.status === FellowshipApplicationStatus.CHANGES_REQUESTED;
  const actionsDisabled = isFinal || awaitingApplicant;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0.75,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: { xs: 2.5, md: 3 }, flex: 1, overflowY: 'auto', maxHeight: '74vh' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {fields.title || `${formatFellowshipType(app.type)} fellowship`}
              </Typography>
              <StatusChip status={app.status} />
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatFellowshipType(app.type)}
              {handle && <> · {handle}</>}
              <> · submitted {relativeDays(app.createdAt)}</>
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.75}>
            <IconButton
              onClick={() =>
                window.open(
                  `/fellowship/applications/${app.id}/proposal/print`,
                  '_blank',
                )
              }
              size="small"
              title="Export as PDF"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 0.5,
                color: 'text.secondary',
                width: 28,
                height: 28,
                '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.04)' },
              }}
            >
              <FileDown size={14} />
            </IconButton>
            <PaginatorButton onClick={onPrev} disabled={!canPrev} dir="prev" />
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', alignSelf: 'center', minWidth: 40, textAlign: 'center' }}
            >
              {position} / {total}
            </Typography>
            <PaginatorButton onClick={onNext} disabled={!canNext} dir="next" />
          </Stack>
        </Stack>

        <Box sx={{ mt: 2.5 }} />

        {isLoadingProposal && !proposal ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          // Reviewers read proposals in full, so no expandable clamping here.
          <ProposalView proposal={proposal} />
        )}

        {app.status !== FellowshipApplicationStatus.SUBMITTED && app.reviewerRemarks && (
          <Alert
            severity={awaitingApplicant ? 'warning' : 'info'}
            sx={{ mt: 2 }}
            icon={<MessageSquare size={16} />}
          >
            <strong>{app.reviewedByName ?? 'Reviewer'}:</strong> {app.reviewerRemarks}
          </Alert>
        )}
      </Box>

      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {awaitingApplicant ? (
            <>Awaiting applicant revision</>
          ) : app.reviewedByName ? (
            <>Reviewed by <strong>{app.reviewedByName}</strong></>
          ) : (
            <>Awaiting review</>
          )}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={onRequestChanges}
            disabled={isReviewing || actionsDisabled}
            sx={{ color: 'text.primary', borderColor: 'divider' }}
          >
            Request changes
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={onReject}
            disabled={isReviewing || actionsDisabled}
            startIcon={<X size={14} />}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            onClick={onAccept}
            disabled={isReviewing || actionsDisabled}
            startIcon={<Check size={14} />}
          >
            Accept
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

const PaginatorButton = ({
  onClick,
  disabled,
  dir,
}: {
  onClick: () => void;
  disabled: boolean;
  dir: 'prev' | 'next';
}) => (
  <IconButton
    onClick={onClick}
    disabled={disabled}
    size="small"
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 0.5,
      color: 'text.secondary',
      width: 28,
      height: 28,
      '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.04)' },
      '&.Mui-disabled': { opacity: 0.4 },
    }}
  >
    {dir === 'prev' ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
  </IconButton>
);

// ---- shared dialog ----

// Require an actual Drive *folder* URL (optionally account-scoped /u/N/),
// not just any drive.google.com link — the folder hosts the fellow's docs.
const isDriveFolderUrl = (v: string): boolean =>
  /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/[\w-]+([?#].*)?$/.test(
    v.trim(),
  );

const AcceptDialog = ({
  open,
  value,
  onChange,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) => {
  const touched = value.trim().length > 0;
  const valid = isDriveFolderUrl(value);
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Accept application</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Paste the Google Drive folder for this fellow. It hosts the unsigned
          contract and is where they'll upload their W-8BEN form. Accepting creates
          a fellowship in PENDING.
        </Typography>
        <TextField
          fullWidth
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/…"
          autoFocus
          error={touched && !valid}
          helperText={
            touched && !valid
              ? 'Enter a Google Drive folder URL (https://drive.google.com/drive/folders/…)'
              : ' '
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onConfirm}
          disabled={!valid || busy}
        >
          {busy ? 'Accepting…' : 'Accept'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RemarksDialog = ({
  open,
  title,
  helper,
  confirmLabel,
  confirmColor,
  value,
  onChange,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  title: string;
  helper: string;
  confirmLabel: string;
  confirmColor: 'error' | 'warning' | 'primary';
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) => (
  <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
    <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
    <DialogContent>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {helper}
      </Typography>
      <TextField
        multiline
        fullWidth
        minRows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Remarks (required)"
        autoFocus
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancel</Button>
      <Button
        variant="contained"
        color={confirmColor}
        onClick={onConfirm}
        disabled={!value.trim() || busy}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ApplicationsAdmin;
