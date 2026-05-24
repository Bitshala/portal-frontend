import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowLeft, Check, ChevronDown, ChevronUp } from 'lucide-react';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import StartContractDialog from '../../components/fellowship/StartContractDialog';
import StatusChip from '../../components/fellowship/StatusChip';
import { useFellowship, useMyReports } from '../../hooks/fellowshipHooks';
import {
  FellowshipStatus,
  type FellowshipOnboardingDto,
} from '../../types/fellowship';

const ONBOARDING_FIELDS: {
  key: keyof FellowshipOnboardingDto;
  label: string;
  multiline?: boolean;
  chips?: boolean;
}[] = [
  { key: 'githubProfile', label: 'GitHub profile' },
  { key: 'location', label: 'Location' },
  { key: 'academicBackground', label: 'Academic background' },
  { key: 'graduationYear', label: 'Graduation year' },
  { key: 'professionalExperience', label: 'Professional experience', multiline: true },
  { key: 'projectName', label: 'Project name' },
  { key: 'projectGithubLink', label: 'Project GitHub link' },
  { key: 'projectMaintainerName', label: 'Project maintainer' },
  { key: 'mentorContact', label: 'Mentor contact' },
  { key: 'domains', label: 'Domains', chips: true },
  { key: 'codingLanguages', label: 'Coding languages', chips: true },
  { key: 'educationInterests', label: 'Education interests', chips: true },
  { key: 'bitcoinContributions', label: 'Bitcoin contributions', multiline: true },
  { key: 'bitcoinMotivation', label: 'Motivation for Bitcoin work', multiline: true },
  { key: 'bitcoinOssGoal', label: 'Open-source goal', multiline: true },
  { key: 'additionalInfo', label: 'Additional info', multiline: true },
  { key: 'questionsForBitshala', label: 'Questions for Bitshala', multiline: true },
];

const formatAmount = (amount: string | null) => {
  if (!amount) return '';
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
};

const monthRange = (startDate: string, endDate: string): { month: number; year: number }[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const out: { month: number; year: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const stop = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= stop) {
    out.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
};

const monthName = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });

const ReadOnlyField = ({
  label,
  value,
  multiline,
  fullWidth,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  fullWidth?: boolean;
}) => (
  <Grid size={{ xs: 12, md: fullWidth ? 12 : 6 }}>
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        letterSpacing: 0.6,
        fontWeight: 600,
        textTransform: 'uppercase',
        fontSize: '0.68rem',
        display: 'block',
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        color: value ? 'text.primary' : 'text.secondary',
        whiteSpace: multiline ? 'pre-wrap' : 'normal',
        lineHeight: multiline ? 1.55 : 1.4,
        wordBreak: 'break-word',
      }}
    >
      {value || '—'}
    </Typography>
  </Grid>
);

const ReadOnlyChips = ({ label, values }: { label: string; values: string[] }) => (
  <Grid size={{ xs: 12, md: 6 }}>
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        letterSpacing: 0.6,
        fontWeight: 600,
        textTransform: 'uppercase',
        fontSize: '0.68rem',
        display: 'block',
        mb: 0.75,
      }}
    >
      {label}
    </Typography>
    {values.length === 0 ? (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        —
      </Typography>
    ) : (
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        {values.map((v) => (
          <Chip key={v} label={v} size="small" />
        ))}
      </Stack>
    )}
  </Grid>
);

const FellowshipDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const { data: fellowship, isLoading } = useFellowship(id ?? '', { enabled: !!id });
  const reportsQuery = useMyReports({ page: 0, pageSize: 24 });

  const months = useMemo(() => {
    if (!fellowship?.startDate || !fellowship?.endDate) return [];
    return monthRange(fellowship.startDate, fellowship.endDate);
  }, [fellowship?.startDate, fellowship?.endDate]);

  const reportsForFellowship = (reportsQuery.data?.records ?? []).filter(
    (r) => r.fellowshipId === id,
  );

  const reportByMonth = useMemo(() => {
    const map = new Map<string, (typeof reportsForFellowship)[number]>();
    for (const r of reportsForFellowship) map.set(`${r.year}-${r.month}`, r);
    return map;
  }, [reportsForFellowship]);

  if (isLoading || !fellowship) {
    return (
      <FellowshipPageLayout>
        <CircularProgress size={22} />
      </FellowshipPageLayout>
    );
  }

  const isActive = fellowship.status === FellowshipStatus.ACTIVE;
  const isCompleted = fellowship.status === FellowshipStatus.COMPLETED;
  const isPending = fellowship.status === FellowshipStatus.PENDING;

  return (
    <FellowshipPageLayout>
      <Button
        onClick={() => navigate(-1)}
        startIcon={<ArrowLeft size={16} />}
        sx={{
          mb: 2,
          pl: 0,
          color: 'text.secondary',
          '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
        }}
      >
        Back
      </Button>

      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderColor: 'divider', mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'flex-start' }}>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {fellowship.type} fellowship
                </Typography>
                <StatusChip status={fellowship.status} />
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {isPending && 'Application accepted · contract not started'}
                {isActive && fellowship.startDate && fellowship.endDate && (
                  <>
                    {new Date(fellowship.startDate).toLocaleDateString()} —{' '}
                    {new Date(fellowship.endDate).toLocaleDateString()} · {formatAmount(fellowship.amountUsd)}
                  </>
                )}
                {isCompleted && 'Closed'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Created {new Date(fellowship.createdAt).toLocaleDateString()}
              </Typography>
            </Box>

            {isPending && (
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.6,
                    px: 1,
                    py: 0.4,
                    borderRadius: 0.5,
                    border: '1px solid',
                    borderColor: 'success.main',
                    color: 'success.main',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                  }}
                >
                  <Check size={13} strokeWidth={3} />
                  Accepted
                </Box>
                <Button variant="contained" onClick={() => setContractDialogOpen(true)}>
                  Start contract
                </Button>
              </Stack>
            )}
          </Stack>
          {isPending && (
            <Alert severity="info" sx={{ mt: 2 }}>
              This application has been accepted. Set start/end dates and the monthly payout to
              activate the fellowship.
            </Alert>
          )}
        </CardContent>
      </Card>

      <StartContractDialog
        fellowship={contractDialogOpen ? fellowship : null}
        onClose={() => setContractDialogOpen(false)}
        onSuccess={(msg) => {
          setContractDialogOpen(false);
          setToast({ kind: 'success', msg });
        }}
        onError={(msg) => setToast({ kind: 'error', msg })}
      />

      <Card variant="outlined" sx={{ borderColor: 'divider', mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Profile
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  letterSpacing: 0.6,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0.5,
                  px: 0.75,
                  py: 0.25,
                }}
              >
                Read-only
              </Typography>
            </Stack>
            <IconButton size="small" onClick={() => setOnboardingOpen((o) => !o)}>
              {onboardingOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </IconButton>
          </Stack>
          <Collapse in={onboardingOpen}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2.5}>
              {ONBOARDING_FIELDS.map((f) => {
                if (f.chips) {
                  const values = (fellowship[f.key] as string[] | null) ?? [];
                  return <ReadOnlyChips key={f.key} label={f.label} values={values} />;
                }
                const raw = fellowship[f.key];
                const value = raw == null ? '' : String(raw);
                return (
                  <ReadOnlyField
                    key={f.key}
                    label={f.label}
                    value={value}
                    multiline={f.multiline}
                    fullWidth={f.multiline}
                  />
                );
              })}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Monthly reports
          </Typography>
          {months.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Reports become available once your contract is active.
            </Typography>
          )}
          <Stack divider={<Divider flexItem />}>
            {months.map(({ month, year }) => {
              const existing = reportByMonth.get(`${year}-${month}`);
              const canWrite = isActive && !existing;
              return (
                <Stack
                  key={`${year}-${month}`}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ py: 1.25 }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {monthName(month)} {year}
                    </Typography>
                    {existing ? (
                      <StatusChip status={existing.status} />
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        No report filed
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    {existing ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          navigate(`/fellowship/fellowships/${id}/reports/${existing.id}`)
                        }
                      >
                        View
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!canWrite}
                        onClick={() =>
                          navigate(
                            `/fellowship/fellowships/${id}/reports/new?month=${month}&year=${year}`,
                          )
                        }
                      >
                        Write report
                      </Button>
                    )}
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    </FellowshipPageLayout>
  );
};

export default FellowshipDashboard;
