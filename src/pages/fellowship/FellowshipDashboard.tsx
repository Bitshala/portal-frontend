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
  TextField,
  Typography,
} from '@mui/material';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import FellowshipLayout from '../../components/fellowship/FellowshipLayout';
import StatusChip from '../../components/fellowship/StatusChip';
import {
  useFellowship,
  useMyReports,
  useUpdateFellowshipOnboarding,
} from '../../hooks/fellowshipHooks';
import {
  FellowshipStatus,
  type FellowshipOnboardingDto,
  type GetFellowshipResponseDto,
} from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';

const ONBOARDING_FIELDS: { key: keyof FellowshipOnboardingDto; label: string; multiline?: boolean; number?: boolean; chips?: boolean }[] = [
  { key: 'githubProfile', label: 'GitHub profile' },
  { key: 'location', label: 'Location' },
  { key: 'academicBackground', label: 'Academic background' },
  { key: 'graduationYear', label: 'Graduation year', number: true },
  { key: 'professionalExperience', label: 'Professional experience', multiline: true },
  { key: 'projectName', label: 'Project name' },
  { key: 'projectGithubLink', label: 'Project GitHub link' },
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

const ChipEditor = ({
  values,
  onChange,
  disabled,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (values.includes(v)) return;
    onChange([...values, v]);
    setInput('');
  };
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {values.map((v) => (
          <Chip
            key={v}
            label={v}
            size="small"
            onDelete={disabled ? undefined : () => onChange(values.filter((x) => x !== v))}
            deleteIcon={<X size={14} />}
          />
        ))}
      </Stack>
      {!disabled && (
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Add…"
            fullWidth
          />
          <IconButton onClick={add} size="small" color="primary">
            <Plus size={16} />
          </IconButton>
        </Stack>
      )}
    </Box>
  );
};

const FellowshipDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const [form, setForm] = useState<Partial<FellowshipOnboardingDto>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const { data: fellowship, isLoading } = useFellowship(id ?? '', { enabled: !!id });
  const reportsQuery = useMyReports({ page: 0, pageSize: 24 });
  const updateMut = useUpdateFellowshipOnboarding();

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

  const getValue = (key: keyof FellowshipOnboardingDto) => {
    if (key in form) return form[key];
    return fellowship?.[key] ?? (ONBOARDING_FIELDS.find((f) => f.key === key)?.chips ? [] : '');
  };

  const setValue = (key: keyof FellowshipOnboardingDto, v: unknown) => {
    setForm((f) => ({ ...f, [key]: v as never }));
    setDirty((d) => new Set(d).add(key));
  };

  const handleSave = async () => {
    if (!id || dirty.size === 0) return;
    const body: Record<string, unknown> = {};
    for (const k of dirty) body[k] = form[k as keyof FellowshipOnboardingDto];
    try {
      await updateMut.mutateAsync({ id, body });
      setToast({ kind: 'success', msg: 'Onboarding saved.' });
      setDirty(new Set());
      setForm({});
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  if (isLoading || !fellowship) {
    return (
      <FellowshipLayout>
        <CircularProgress size={22} />
      </FellowshipLayout>
    );
  }

  const isActive = fellowship.status === FellowshipStatus.ACTIVE;
  const isCompleted = fellowship.status === FellowshipStatus.COMPLETED;

  return (
    <FellowshipLayout>
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderColor: 'divider', mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {fellowship.type} fellowship
                </Typography>
                <StatusChip status={fellowship.status} />
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {fellowship.status === FellowshipStatus.PENDING && 'Awaiting contract'}
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
          </Stack>
          {fellowship.status === FellowshipStatus.PENDING && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Your application is accepted. An admin will start your contract soon.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderColor: 'divider', mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Onboarding
            </Typography>
            <IconButton size="small" onClick={() => setOnboardingOpen((o) => !o)}>
              {onboardingOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </IconButton>
          </Stack>
          <Collapse in={onboardingOpen}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              {ONBOARDING_FIELDS.map((f) => {
                const value = getValue(f.key);
                if (f.chips) {
                  return (
                    <Grid size={{ xs: 12, md: 6 }} key={f.key}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
                        {f.label}
                      </Typography>
                      <ChipEditor
                        values={(value as string[] | null) ?? []}
                        onChange={(next) => setValue(f.key, next)}
                        disabled={isCompleted}
                      />
                    </Grid>
                  );
                }
                return (
                  <Grid size={{ xs: 12, md: f.multiline ? 12 : 6 }} key={f.key}>
                    <TextField
                      label={f.label}
                      value={value ?? ''}
                      onChange={(e) => {
                        const v = f.number ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value;
                        setValue(f.key, v);
                      }}
                      fullWidth
                      size="small"
                      multiline={f.multiline}
                      minRows={f.multiline ? 3 : undefined}
                      type={f.number ? 'number' : 'text'}
                      disabled={isCompleted}
                    />
                  </Grid>
                );
              })}
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={dirty.size === 0 || updateMut.isPending || isCompleted}
              >
                {updateMut.isPending ? 'Saving…' : 'Save onboarding'}
              </Button>
              {dirty.size > 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                  {dirty.size} unsaved change{dirty.size > 1 ? 's' : ''}
                </Typography>
              )}
            </Stack>
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
    </FellowshipLayout>
  );
};

export default FellowshipDashboard;
