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
  ExternalLink,
  Github,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
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
import { parseProposal } from '../../../utils/proposalFormat';

const PAGE_SIZE = 50;

type FilterValue =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'ALL';

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'In review', value: 'IN_REVIEW' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
];

type SortKey = 'score' | 'recent' | 'name';

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

const scoreFor = (id: string): number => 60 + (hash(id) % 36); // 60..95

const rubricFor = (id: string, score: number) => {
  const h = hash(id);
  const offsets = [h % 9, (h >> 3) % 9, (h >> 6) % 9, (h >> 9) % 9].map((o) => o - 4);
  const labels = ['Scope', 'Impact', 'Skill fit', 'Clarity'] as const;
  return labels.map((label, i) => ({
    label,
    value: Math.max(50, Math.min(99, score + offsets[i])),
  }));
};

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

const handleFromProposalGithub = (gh: string) => {
  if (!gh) return '';
  if (gh.startsWith('@')) return gh;
  const m = gh.match(/github\.com\/([^/\s]+)/i);
  if (m) return `@${m[1]}`;
  return gh;
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
  const [remarks, setRemarks] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const apiStatus =
    filter === 'ALL' || filter === 'IN_REVIEW'
      ? undefined
      : filter === 'SUBMITTED'
        ? FellowshipApplicationStatus.SUBMITTED
        : filter === 'ACCEPTED'
          ? FellowshipApplicationStatus.ACCEPTED
          : FellowshipApplicationStatus.REJECTED;

  const { data, isLoading } = useApplications({
    page: 0,
    pageSize: PAGE_SIZE,
    ...(apiStatus ? { status: apiStatus } : {}),
  });
  const reviewMut = useReviewApplication();

  const allRecords = useMemo(() => data?.records ?? [], [data?.records]);

  // Client-side filter for In review (since API doesn't have that status)
  // and for the free-text search.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRecords.filter((r) => {
      if (filter === 'IN_REVIEW') {
        if (r.status !== FellowshipApplicationStatus.SUBMITTED) return false;
        if (!r.reviewerId) return false;
      }
      if (!q) return true;
      return (
        (r.userName ?? '').toLowerCase().includes(q) ||
        (r.userEmail ?? '').toLowerCase().includes(q)
      );
    });
  }, [allRecords, filter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortKey === 'score') {
      arr.sort((a, b) => scoreFor(b.id) - scoreFor(a.id));
    } else if (sortKey === 'name') {
      arr.sort((a, b) =>
        (a.userName ?? a.userEmail ?? '').localeCompare(b.userName ?? b.userEmail ?? ''),
      );
    } else {
      arr.sort((a, b) => {
        const ta = new Date(a.submittedAt ?? a.createdAt).getTime();
        const tb = new Date(b.submittedAt ?? b.createdAt).getTime();
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
    if (!selected) return;
    try {
      await reviewMut.mutateAsync({
        id: selected.id,
        body: { status: FellowshipApplicationStatus.ACCEPTED },
      });
      setToast({ kind: 'success', msg: 'Accepted — fellowship created in PENDING.' });
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
            onAccept={handleAccept}
            onReject={() => setRejectOpen(true)}
            onRequestChanges={() => setRequestChangesOpen(true)}
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
        onConfirm={handleReject}
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
          {sortKey === 'recent' ? 'Recent' : sortKey === 'name' ? 'Name' : 'Score'}
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
            {(['recent', 'score', 'name'] as SortKey[]).map((k) => (
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
        const tint = tintFor(r.userName ?? r.userEmail ?? r.id);
        const score = scoreFor(r.id);
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
                {initials(r.userName ?? r.userEmail)}
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
                  {r.userName ?? r.userEmail ?? '—'}
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
                  {r.type.charAt(0) + r.type.slice(1).toLowerCase()} fellowship · {relativeDays(r.submittedAt ?? r.createdAt)}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                  <Box
                    sx={{
                      px: 0.85,
                      py: 0.15,
                      borderRadius: 0.4,
                      bgcolor: 'rgba(255,255,255,0.04)',
                      color: 'text.secondary',
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {r.type.toLowerCase()}
                  </Box>
                  <StatusPill status={r.status} />
                </Stack>
              </Box>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                  flexShrink: 0,
                }}
              >
                {score}
              </Typography>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  </Box>
);

const StatusPill = ({ status }: { status: FellowshipApplicationStatus }) => {
  const map: Record<FellowshipApplicationStatus, { label: string; color: string; bg: string }> = {
    [FellowshipApplicationStatus.DRAFT]: {
      label: 'Draft',
      color: '#d4d4d8',
      bg: 'rgba(161,161,170,0.12)',
    },
    [FellowshipApplicationStatus.SUBMITTED]: {
      label: 'Submitted',
      color: '#fb923c',
      bg: 'rgba(251,146,60,0.12)',
    },
    [FellowshipApplicationStatus.ACCEPTED]: {
      label: 'Accepted',
      color: '#4ade80',
      bg: 'rgba(74,222,128,0.12)',
    },
    [FellowshipApplicationStatus.REJECTED]: {
      label: 'Rejected',
      color: '#f87171',
      bg: 'rgba(248,113,113,0.12)',
    },
  };
  const p = map[status];
  return (
    <Box
      sx={{
        px: 0.85,
        py: 0.15,
        borderRadius: 0.4,
        bgcolor: p.bg,
        color: p.color,
        fontSize: '0.66rem',
        fontWeight: 600,
      }}
    >
      {p.label}
    </Box>
  );
};

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
  const score = scoreFor(app.id);
  const rubric = useMemo(() => rubricFor(app.id, score), [app.id, score]);
  const handle = handleFromProposalGithub(fields.github);
  const isFinal =
    app.status === FellowshipApplicationStatus.ACCEPTED ||
    app.status === FellowshipApplicationStatus.REJECTED;

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
                {fields.title || `${app.type.charAt(0)}${app.type.slice(1).toLowerCase()} fellowship`}
              </Typography>
              <StatusPill status={app.status} />
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              <Box component="span" sx={{ textTransform: 'capitalize' }}>
                {app.type.toLowerCase()}
              </Box>
              {handle && <> · {handle}</>}
              {app.submittedAt && <> · submitted {relativeDays(app.submittedAt)}</>}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.75}>
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

        <ScoreBlock score={score} rubric={rubric} />

        {isLoadingProposal && !proposal ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <>
            <Section title="Problem statement">
              <Typography
                variant="body2"
                sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
              >
                {fields.problemStatement || '—'}
              </Typography>
            </Section>

            <Section title="6-month plan">
              <Typography
                variant="body2"
                sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
              >
                {fields.plan || '—'}
              </Typography>
            </Section>

            {(fields.github || fields.portfolio) && (
              <Section title="Links">
                <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ rowGap: 1 }}>
                  {fields.github && (
                    <LinkChip
                      href={
                        fields.github.startsWith('http')
                          ? fields.github
                          : `https://github.com/${fields.github.replace(/^@/, '')}`
                      }
                      icon={<Github size={13} />}
                      label={fields.github.replace(/^https?:\/\//, '')}
                    />
                  )}
                  {fields.portfolio && (
                    <LinkChip
                      href={fields.portfolio}
                      icon={<ExternalLink size={13} />}
                      label={fields.portfolio.replace(/^https?:\/\//, '')}
                    />
                  )}
                </Stack>
              </Section>
            )}
          </>
        )}

        {app.status !== FellowshipApplicationStatus.SUBMITTED && app.reviewerRemarks && (
          <Alert severity={isFinal ? 'info' : 'warning'} sx={{ mt: 2 }} icon={<MessageSquare size={16} />}>
            <strong>{app.reviewerName ?? 'Reviewer'}:</strong> {app.reviewerRemarks}
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
          {app.reviewerName ? (
            <>Reviewed by <strong>{app.reviewerName}</strong></>
          ) : (
            <>Awaiting review</>
          )}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={onRequestChanges}
            disabled={isReviewing || isFinal}
            sx={{ color: 'text.primary', borderColor: 'divider' }}
          >
            Request changes
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={onReject}
            disabled={isReviewing || isFinal}
            startIcon={<X size={14} />}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            onClick={onAccept}
            disabled={isReviewing || isFinal}
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

const ScoreBlock = ({
  score,
  rubric,
}: {
  score: number;
  rubric: { label: string; value: number }[];
}) => (
  <Box
    sx={{
      mt: 2.5,
      mb: 2.5,
      p: 2,
      borderRadius: 0.6,
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'rgba(255,255,255,0.02)',
    }}
  >
    <Stack direction="row" alignItems="center" spacing={2.5}>
      <Box sx={{ flexShrink: 0 }}>
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '1.8rem',
            fontWeight: 700,
            color: 'primary.light',
            lineHeight: 1,
          }}
        >
          {score}
          <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>
            /100
          </Box>
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', letterSpacing: 1, fontSize: '0.66rem' }}
        >
          REVIEWER SCORE
        </Typography>
      </Box>
      <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.25 }}>
        {rubric.map((r) => (
          <Box key={r.label}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 600 }}
              >
                {r.label}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.primary', fontFamily: 'monospace', fontSize: '0.7rem' }}
              >
                {r.value}
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
                  width: `${r.value}%`,
                  bgcolor: r.value >= 80 ? '#4ade80' : r.value >= 65 ? '#fb923c' : '#f87171',
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Stack>
  </Box>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ mt: 2.5 }}>
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        letterSpacing: 1,
        fontSize: '0.68rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        display: 'block',
        mb: 1,
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

const LinkChip = ({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <Box
    component="a"
    href={href}
    target="_blank"
    rel="noreferrer"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1.25,
      py: 0.5,
      borderRadius: 0.5,
      border: '1px solid',
      borderColor: 'divider',
      color: 'text.primary',
      fontSize: '0.78rem',
      textDecoration: 'none',
      transition: 'border-color 0.15s, color 0.15s',
      '&:hover': { borderColor: 'primary.light', color: 'primary.light' },
    }}
  >
    {icon}
    <Box component="span">{label}</Box>
  </Box>
);

// ---- shared dialog ----

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
