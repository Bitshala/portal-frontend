import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowRight, FileText, RefreshCw, Trash2 } from 'lucide-react';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import ProposalView from '../../components/fellowship/ProposalView';
import StatusChip from '../../components/fellowship/StatusChip';
import { fontFamilyMono } from '../../components/fellowship/theme';
import {
  useApplicationProposal,
  useDeleteApplication,
  useMyApplications,
  useSubmitApplication,
} from '../../hooks/fellowshipHooks';
import {
  FellowshipApplicationStatus,
  type GetFellowshipApplicationResponseDto,
} from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';
import { formatFellowshipType } from '../../utils/fellowshipFormat';
import { parseProposal } from '../../utils/proposalFormat';

type StatusFilter = 'ALL' | FellowshipApplicationStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: FellowshipApplicationStatus.DRAFT },
  // StatusChip renders SUBMITTED as "Under review" — keep the pill in sync.
  { label: 'Under review', value: FellowshipApplicationStatus.SUBMITTED },
  { label: 'Changes requested', value: FellowshipApplicationStatus.CHANGES_REQUESTED },
  { label: 'Accepted', value: FellowshipApplicationStatus.ACCEPTED },
  { label: 'Rejected', value: FellowshipApplicationStatus.REJECTED },
];

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const MyApplications = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useMyApplications({ page: 0, pageSize: 50 });
  const deleteMut = useDeleteApplication();
  const submitMut = useSubmitApplication();
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const applications = useMemo(() => {
    const records = data?.records ?? [];
    return [...records].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [data?.records]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      ALL: applications.length,
      [FellowshipApplicationStatus.DRAFT]: 0,
      [FellowshipApplicationStatus.SUBMITTED]: 0,
      [FellowshipApplicationStatus.CHANGES_REQUESTED]: 0,
      [FellowshipApplicationStatus.ACCEPTED]: 0,
      [FellowshipApplicationStatus.REJECTED]: 0,
    };
    for (const a of applications) c[a.status] += 1;
    return c;
  }, [applications]);

  const filtered = useMemo(
    () => applications.filter((a) => filter === 'ALL' || a.status === filter),
    [applications, filter],
  );

  // Fall back to the first row when nothing is explicitly selected (or the
  // selected one was filtered/deleted away), mirroring the admin review pane.
  const selectedIdx = filtered.findIndex((a) => a.id === selectedId);
  const selected = selectedIdx >= 0 ? filtered[selectedIdx] : filtered[0] ?? null;
  const effectiveSelectedId = selected?.id ?? null;

  const proposalQuery = useApplicationProposal(effectiveSelectedId ?? '', {
    enabled: !!effectiveSelectedId,
  });

  const handleDiscard = async (id: string) => {
    if (!confirm('Discard this draft? This cannot be undone.')) return;
    setActionError(null);
    try {
      await deleteMut.mutateAsync({ id });
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      setActionError(extractErrorMessage(e));
    }
  };

  const handleResubmit = async (id: string) => {
    setActionError(null);
    try {
      await submitMut.mutateAsync({ id });
    } catch (e) {
      setActionError(extractErrorMessage(e));
    }
  };

  return (
    <FellowshipPageLayout
      title="My applications"
      subtitle="Track the status of your fellowship applications."
      hideIcon
    >
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={22} />
        </Box>
      ) : applications.length === 0 ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0.75,
            bgcolor: 'background.paper',
            py: 6,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            No applications yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
            Submit a proposal to start your fellowship journey.
          </Typography>
          <Button
            variant="contained"
            endIcon={<ArrowRight size={16} />}
            onClick={() => navigate('/fellowship/apply')}
          >
            Apply now
          </Button>
        </Box>
      ) : (
        <>
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
              endIcon={<ArrowRight size={16} />}
              onClick={() => navigate('/fellowship/apply')}
              sx={{ alignSelf: { xs: 'flex-end', md: 'center' }, flexShrink: 0 }}
            >
              Apply now
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 360px) minmax(0, 1fr)' },
              gap: 2,
            }}
          >
            <ApplicationList
              records={filtered}
              selectedId={effectiveSelectedId}
              onSelect={setSelectedId}
            />

            {selected ? (
              <ApplicationDetail
                app={selected}
                proposal={proposalQuery.data?.proposal ?? ''}
                isLoadingProposal={proposalQuery.isLoading}
                onContinue={() => navigate(`/fellowship/apply?appId=${selected.id}`)}
                onDiscard={() => handleDiscard(selected.id)}
                onResubmit={() => handleResubmit(selected.id)}
                isDiscarding={deleteMut.isPending}
                isResubmitting={submitMut.isPending}
              />
            ) : (
              <EmptyDetail />
            )}
          </Box>
        </>
      )}
    </FellowshipPageLayout>
  );
};

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

// ---- left list ----

const ApplicationList = ({
  records,
  selectedId,
  onSelect,
}: {
  records: GetFellowshipApplicationResponseDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) => {
  if (records.length === 0) {
    return (
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.75,
          bgcolor: 'background.paper',
          p: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No applications with this status.
        </Typography>
      </Box>
    );
  }

  return (
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
      <Stack spacing={0.5}>
        {records.map((app) => (
          <ApplicationListItem
            key={app.id}
            app={app}
            active={app.id === selectedId}
            onSelect={() => onSelect(app.id)}
          />
        ))}
      </Stack>
    </Box>
  );
};

const ApplicationListItem = ({
  app,
  active,
  onSelect,
}: {
  app: GetFellowshipApplicationResponseDto;
  active: boolean;
  onSelect: () => void;
}) => {
  const proposalQuery = useApplicationProposal(app.id);
  const title = useMemo(
    () =>
      proposalQuery.data?.proposal ? parseProposal(proposalQuery.data.proposal).title : '',
    [proposalQuery.data?.proposal],
  );

  return (
    <Box
      onClick={onSelect}
      sx={{
        p: 1.25,
        borderRadius: 0.5,
        cursor: 'pointer',
        bgcolor: active ? 'rgba(249,115,22,0.06)' : 'transparent',
        transition: 'all 0.12s',
        '&:hover': active ? {} : { bgcolor: 'rgba(255,255,255,0.03)' },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '0.88rem',
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {title || (
            <Box component="span" sx={{ color: 'text.secondary' }}>
              Untitled proposal
            </Box>
          )}
        </Typography>
        <StatusChip status={app.status} />
      </Stack>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontFamily: fontFamilyMono,
          fontSize: '0.72rem',
          display: 'block',
          mt: 0.5,
        }}
      >
        {formatFellowshipType(app.type)} · updated {formatDate(app.updatedAt)}
      </Typography>
    </Box>
  );
};

// ---- right detail ----

const EmptyDetail = () => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 0.75,
      bgcolor: 'background.paper',
      p: 6,
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      Select an application from the list to view its proposal.
    </Typography>
  </Box>
);

const ApplicationDetail = ({
  app,
  proposal,
  isLoadingProposal,
  onContinue,
  onDiscard,
  onResubmit,
  isDiscarding,
  isResubmitting,
}: {
  app: GetFellowshipApplicationResponseDto;
  proposal: string;
  isLoadingProposal: boolean;
  onContinue: () => void;
  onDiscard: () => void;
  onResubmit: () => void;
  isDiscarding: boolean;
  isResubmitting: boolean;
}) => {
  const fields = useMemo(() => parseProposal(proposal), [proposal]);
  const title = fields.title || `${formatFellowshipType(app.type)} fellowship`;
  const isDraft = app.status === FellowshipApplicationStatus.DRAFT;
  const needsChanges = app.status === FellowshipApplicationStatus.CHANGES_REQUESTED;
  const hasActions = isDraft || needsChanges;

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
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <StatusChip status={app.status} />
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {formatFellowshipType(app.type)} · updated {formatDate(app.updatedAt)}
        </Typography>

        {needsChanges && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Changes requested by {app.reviewedByName ?? 'the reviewer'}:</strong>{' '}
            {app.reviewerRemarks ?? 'Please revise your proposal before resubmitting.'}
          </Alert>
        )}
        {app.status === FellowshipApplicationStatus.REJECTED && app.reviewerRemarks && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>Reviewer remarks:</strong> {app.reviewerRemarks}
          </Alert>
        )}
        {app.status === FellowshipApplicationStatus.ACCEPTED && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Application accepted. A fellowship entry has been created for you.
          </Alert>
        )}

        <Box sx={{ mt: 1.5 }}>
          {isLoadingProposal && !proposal ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={20} />
            </Box>
          ) : (
            <ProposalView proposal={proposal} expandable />
          )}
        </Box>
      </Box>

      {hasActions && (
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            p: 2,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {isDraft && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={14} />}
              onClick={onDiscard}
              disabled={isDiscarding}
            >
              Discard
            </Button>
          )}
          {needsChanges && (
            <Button
              variant="outlined"
              startIcon={<RefreshCw size={14} />}
              onClick={onResubmit}
              disabled={isResubmitting}
              sx={{ color: 'text.primary', borderColor: 'divider' }}
            >
              {isResubmitting ? 'Resubmitting…' : 'Resubmit as-is'}
            </Button>
          )}
          <Button variant="contained" startIcon={<FileText size={14} />} onClick={onContinue}>
            {needsChanges ? 'Edit proposal' : 'Continue'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default MyApplications;
