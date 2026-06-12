import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { ArrowRight, FileText } from 'lucide-react';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import ProposalDialog from '../../components/fellowship/ProposalDialog';
import StatusChip from '../../components/fellowship/StatusChip';
import { fontFamilyMono } from '../../components/fellowship/theme';
import { useApplicationProposal, useMyApplications } from '../../hooks/fellowshipHooks';
import {
  FellowshipApplicationStatus,
  type GetFellowshipApplicationResponseDto,
} from '../../types/fellowship';
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
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [proposalAppId, setProposalAppId] = useState<string | null>(null);

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

  return (
    <FellowshipPageLayout
      title="My applications"
      subtitle="Track the status of your fellowship applications."
      hideIcon
    >
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

          {filtered.length === 0 ? (
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
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No applications with this status.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 0.75,
                bgcolor: 'background.paper',
                overflow: 'hidden',
              }}
            >
              {filtered.map((app) => (
                <ApplicationRow
                  key={app.id}
                  app={app}
                  onContinue={() => navigate(`/fellowship/apply?appId=${app.id}`)}
                  onViewProposal={() => setProposalAppId(app.id)}
                />
              ))}
            </Box>
          )}
        </>
      )}

      <ProposalDialog applicationId={proposalAppId} onClose={() => setProposalAppId(null)} />
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

const ApplicationRow = ({
  app,
  onContinue,
  onViewProposal,
}: {
  app: GetFellowshipApplicationResponseDto;
  onContinue: () => void;
  onViewProposal: () => void;
}) => {
  const proposalQuery = useApplicationProposal(app.id);
  const title = useMemo(
    () =>
      proposalQuery.data?.proposal ? parseProposal(proposalQuery.data.proposal).title : '',
    [proposalQuery.data?.proposal],
  );
  const editable =
    app.status === FellowshipApplicationStatus.DRAFT ||
    app.status === FellowshipApplicationStatus.CHANGES_REQUESTED;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{
        px: 2.5,
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '0.92rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title || (
            <Box component="span" sx={{ color: 'text.secondary' }}>
              Untitled proposal
            </Box>
          )}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontFamily: fontFamilyMono, fontSize: '0.72rem' }}
        >
          {formatFellowshipType(app.type)} · updated {formatDate(app.updatedAt)}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <StatusChip status={app.status} />
        <Button
          size="small"
          variant="text"
          startIcon={<FileText size={14} />}
          onClick={onViewProposal}
          sx={{ color: 'text.secondary' }}
        >
          Proposal
        </Button>
        {editable && (
          <Button size="small" variant="outlined" onClick={onContinue}>
            Continue
          </Button>
        )}
      </Stack>
    </Stack>
  );
};

export default MyApplications;
