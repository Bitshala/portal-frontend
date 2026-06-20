import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { ArrowRight } from 'lucide-react';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import ProposalDialog from '../../components/fellowship/ProposalDialog';
import StatusChip from '../../components/fellowship/StatusChip';
import { fontFamilyMono } from '../../components/fellowship/theme';
import { useMyFellowships, useMyReports } from '../../hooks/fellowshipHooks';
import { useFellowshipProjectTitle } from '../../hooks/useFellowshipProjectTitle';
import {
  FellowshipStatus,
  FellowshipType,
  type GetFellowshipResponseDto,
  type GetFellowshipReportResponseDto,
} from '../../types/fellowship';
import { formatFellowshipType } from '../../utils/fellowshipFormat';

type StatusFilter = 'ALL' | FellowshipStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: FellowshipStatus.PENDING },
  { label: 'Awaiting docs', value: FellowshipStatus.AWAITING_DOCUMENTS },
  { label: 'Docs in review', value: FellowshipStatus.DOCUMENTS_IN_REVIEW },
  { label: 'Docs approved', value: FellowshipStatus.DOCUMENTS_APPROVED },
  { label: 'Active', value: FellowshipStatus.ACTIVE },
  { label: 'Completed', value: FellowshipStatus.COMPLETED },
];

const TRACK_COLORS: Record<FellowshipType, string> = {
  [FellowshipType.DEVELOPER]: '#fb923c',
  [FellowshipType.DESIGNER]: '#60a5fa',
  [FellowshipType.EDUCATOR]: '#a78bfa',
};

// ---- helpers ----

const monthShort = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });

const formatDate = (iso: string | null): string => {
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

const MyFellowships = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [proposalAppId, setProposalAppId] = useState<string | null>(null);

  const { data, isLoading } = useMyFellowships({ page: 0, pageSize: 100 });
  const reportsQuery = useMyReports({ page: 0, pageSize: 100 });

  const fellowships = useMemo(() => data?.records ?? [], [data?.records]);
  const reports = useMemo(() => reportsQuery.data?.records ?? [], [reportsQuery.data?.records]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      ALL: fellowships.length,
      [FellowshipStatus.PENDING]: 0,
      [FellowshipStatus.AWAITING_DOCUMENTS]: 0,
      [FellowshipStatus.DOCUMENTS_IN_REVIEW]: 0,
      [FellowshipStatus.DOCUMENTS_APPROVED]: 0,
      [FellowshipStatus.ACTIVE]: 0,
      [FellowshipStatus.COMPLETED]: 0,
    };
    for (const f of fellowships) c[f.status] += 1;
    return c;
  }, [fellowships]);

  const filtered = useMemo(
    () => fellowships.filter((f) => filter === 'ALL' || f.status === filter),
    [fellowships, filter],
  );

  const lastReportByFellowship = useMemo(() => {
    const map = new Map<string, GetFellowshipReportResponseDto>();
    for (const r of reports) {
      const cur = map.get(r.fellowshipId);
      if (!cur || r.year > cur.year || (r.year === cur.year && r.month > cur.month)) {
        map.set(r.fellowshipId, r);
      }
    }
    return map;
  }, [reports]);

  return (
    <FellowshipPageLayout
      title="My fellowships"
      subtitle="Track your fellowships, contracts, and monthly reports."
      hideIcon
    >
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={22} />
        </Box>
      ) : fellowships.length === 0 ? (
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
            No fellowship yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
            Once an application is accepted, your fellowship will appear here.
          </Typography>
          <Button
            variant="contained"
            endIcon={<ArrowRight size={16} />}
            onClick={() => navigate('/fellowship/applications')}
          >
            My applications
          </Button>
        </Box>
      ) : (
        <>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ rowGap: 1, mt: 1.5, mb: 2 }}>
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
            {filtered.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No fellowships with this status.
                </Typography>
              </Box>
            ) : (
              filtered.map((f) => (
                <FellowshipRow
                  key={f.id}
                  fellowship={f}
                  lastReport={lastReportByFellowship.get(f.id)}
                  onOpen={() => setProposalAppId(f.applicationId)}
                  onViewProposal={() => setProposalAppId(f.applicationId)}
                  onDocuments={() => navigate(`/fellowship/fellowships/${f.id}/documents`)}
                />
              ))
            )}
          </Box>
        </>
      )}

      <ProposalDialog applicationId={proposalAppId} onClose={() => setProposalAppId(null)} />
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

// ---- table ----

const COLS = 'minmax(0, 1.8fr) 110px 130px 130px 110px 120px 120px 200px';
const COL_GAP = 2;

const HeaderRow = () => (
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
    <Box>Project</Box>
    <Box>Track</Box>
    <Box>Start date</Box>
    <Box>End date</Box>
    <Box>Payout</Box>
    <Box>Last report</Box>
    <Box>Status</Box>
    <Box>Actions</Box>
  </Box>
);

// The documents action is status-aware: a fellow only needs to act while the
// fellowship is AWAITING_DOCUMENTS (a document is unuploaded or was rejected).
// In every other state the button just opens the documents page to view them.
const docsAction = (status: FellowshipStatus): { label: string; emphasis: boolean } =>
  status === FellowshipStatus.AWAITING_DOCUMENTS
    ? { label: 'Upload docs', emphasis: true }
    : { label: 'View docs', emphasis: false };

// Compact, labeled row action. `emphasis` gives it the orange call-to-action
// treatment (matching the active filter pill) shown when the fellow needs to
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
  lastReport,
  onOpen,
  onViewProposal,
  onDocuments,
}: {
  fellowship: GetFellowshipResponseDto;
  lastReport?: GetFellowshipReportResponseDto;
  onOpen: () => void;
  onViewProposal: () => void;
  onDocuments: () => void;
}) => {
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
      {/* Project */}
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: '0.86rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pr: 1,
        }}
      >
        {projectTitle || (
          <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
            Project title not provided
          </Box>
        )}
      </Typography>

      {/* Track */}
      <Box sx={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: 0.4, color: trackColor }}>
        {formatFellowshipType(fellowship.type)}
      </Box>

      {/* Start date */}
      <Typography
        sx={{
          fontFamily: fontFamilyMono,
          fontSize: '0.78rem',
          color: fellowship.startDate ? 'text.primary' : 'text.secondary',
        }}
      >
        {formatDate(fellowship.startDate)}
      </Typography>

      {/* End date */}
      <Typography
        sx={{
          fontFamily: fontFamilyMono,
          fontSize: '0.78rem',
          color: fellowship.endDate ? 'text.primary' : 'text.secondary',
        }}
      >
        {formatDate(fellowship.endDate)}
      </Typography>

      {/* Payout */}
      <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.78rem', color: 'text.primary' }}>
        {formatPayoutPerMonth(fellowship.amountUsd)}
      </Typography>

      {/* Last report */}
      <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.78rem', color: 'text.secondary' }}>
        {lastReport ? `${monthShort(lastReport.month)} ${lastReport.year}` : '—'}
      </Typography>

      {/* Status */}
      <Box>
        <StatusChip status={fellowship.status} />
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={0.75} alignItems="center">
        <RowActionButton label={docs.label} emphasis={docs.emphasis} onClick={onDocuments} />
        <RowActionButton label="Proposal" onClick={onViewProposal} />
      </Stack>
    </Box>
  );
};

export default MyFellowships;
