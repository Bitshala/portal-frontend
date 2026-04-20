import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Drawer,
  Grid,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import StatusChip from '../../../components/fellowship/StatusChip';
import Tabs from '../../../components/ui/Tabs';
import {
  adminCardSx,
  adminToolbarSx,
  emptyStateSx,
  tableBodyCellSx,
  tableHeaderCellSx,
  tableRowSx,
} from '../../../components/fellowship/tableStyles';
import {
  useFellowship,
  useFellowships,
  useStartFellowshipContract,
} from '../../../hooks/fellowshipHooks';
import {
  FellowshipStatus,
  type GetFellowshipResponseDto,
} from '../../../types/fellowship';
import { extractErrorMessage } from '../../../utils/errorUtils';

const PAGE_SIZE = 50;

const STATUS_TABS: { label: string; value: FellowshipStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: FellowshipStatus.PENDING },
  { label: 'Active', value: FellowshipStatus.ACTIVE },
  { label: 'Completed', value: FellowshipStatus.COMPLETED },
];

const formatAmount = (amount: string | null) => {
  if (!amount) return '—';
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ContractForm = ({
  fellowship,
  onSubmitted,
}: {
  fellowship: GetFellowshipResponseDto;
  onSubmitted: (msg: string) => void;
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
    if (Number.isNaN(n) || n <= 0) return 'Amount must be a positive number.';
    if (!/^\d+(\.\d{1,2})?$/.test(amountUsd)) return 'Amount supports up to 2 decimals.';
    return null;
  };

  const handleSubmit = async () => {
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
      onSubmitted('Contract started.');
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };

  return (
    <Card variant="outlined" sx={{ mt: 2, borderColor: 'divider' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Start contract
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
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
          label="Amount (USD)"
          size="small"
          fullWidth
          value={amountUsd}
          onChange={(e) => setAmountUsd(e.target.value)}
          placeholder="500.00"
          sx={{ mb: 2 }}
        />
        <Button variant="contained" onClick={handleSubmit} disabled={startMut.isPending}>
          {startMut.isPending ? 'Starting…' : 'Start contract'}
        </Button>
      </CardContent>
    </Card>
  );
};

const FellowshipDetail = ({
  id,
  onClose,
  onToast,
}: {
  id: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}) => {
  const { data, isLoading } = useFellowship(id);

  if (isLoading || !data) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  const onboardingMissing =
    data.status === FellowshipStatus.ACTIVE && (!data.projectName || !data.githubProfile);

  const fields: { label: string; value: string | number | string[] | null }[] = [
    { label: 'GitHub', value: data.githubProfile },
    { label: 'Location', value: data.location },
    { label: 'Academic background', value: data.academicBackground },
    { label: 'Graduation year', value: data.graduationYear },
    { label: 'Professional experience', value: data.professionalExperience },
    { label: 'Project name', value: data.projectName },
    { label: 'Project GitHub', value: data.projectGithubLink },
    { label: 'Mentor', value: data.mentorContact },
    { label: 'Domains', value: data.domains },
    { label: 'Coding languages', value: data.codingLanguages },
    { label: 'Education interests', value: data.educationInterests },
    { label: 'Bitcoin contributions', value: data.bitcoinContributions },
    { label: 'Motivation', value: data.bitcoinMotivation },
    { label: 'Open-source goal', value: data.bitcoinOssGoal },
    { label: 'Additional info', value: data.additionalInfo },
    { label: 'Questions for Bitshala', value: data.questionsForBitshala },
  ];

  return (
    <Box sx={{ width: { xs: '100vw', md: 640 }, p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {data.userName || data.userEmail}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {data.type}
          </Typography>
        </Box>
        <StatusChip status={data.status} />
      </Stack>
      {onboardingMissing && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Awaiting onboarding details from the fellow.
        </Alert>
      )}
      {data.status === FellowshipStatus.ACTIVE && data.startDate && data.endDate && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {new Date(data.startDate).toLocaleDateString()} —{' '}
          {new Date(data.endDate).toLocaleDateString()} · {formatAmount(data.amountUsd)}
        </Typography>
      )}
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        {fields.map((f) => {
          const isArr = Array.isArray(f.value);
          const empty = f.value == null || (isArr && (f.value as string[]).length === 0) || f.value === '';
          return (
            <Grid size={{ xs: 12, sm: 6 }} key={f.label}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {f.label}
              </Typography>
              <Typography variant="body2">
                {empty ? '—' : isArr ? (f.value as string[]).join(', ') : String(f.value)}
              </Typography>
            </Grid>
          );
        })}
      </Grid>

      {data.status === FellowshipStatus.PENDING && (
        <ContractForm fellowship={data} onSubmitted={(msg) => { onToast(msg); onClose(); }} />
      )}
    </Box>
  );
};

const FellowshipsAdmin = () => {
  const [page, setPage] = useState(0);
  const [statusTab, setStatusTab] = useState<FellowshipStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading } = useFellowships({ page, pageSize: PAGE_SIZE });
  const allRecords = data?.records ?? [];
  const records = statusTab === 'ALL'
    ? allRecords
    : allRecords.filter((f) => f.status === statusTab);
  const totalPages = data ? Math.ceil(data.totalRecords / PAGE_SIZE) : 1;

  return (
    <FellowshipPageLayout title="Fellowships" subtitle="Manage active fellowships and start contracts." badge="Admin">
      {toast && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast}
        </Alert>
      )}

      <Paper elevation={0} sx={adminCardSx}>
        <Box sx={adminToolbarSx}>
          <Tabs
            tabs={STATUS_TABS.map((t) => ({
              label: t.label,
              value: t.value,
              count: t.value === 'ALL'
                ? allRecords.length
                : allRecords.filter((f) => f.status === t.value).length,
            }))}
            activeTab={statusTab}
            onChange={(v) => {
              setStatusTab(v as FellowshipStatus | 'ALL');
              setPage(0);
            }}
          />
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 10 }}>
            <CircularProgress size={36} sx={{ color: '#f97316' }} />
            <Typography variant="body2" sx={{ color: '#71717a' }}>Loading fellowships…</Typography>
          </Box>
        ) : records.length === 0 ? (
          <Box sx={emptyStateSx}>
            <Typography variant="body2" sx={{ color: '#71717a' }}>No fellowships yet.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderCellSx}>Fellow</TableCell>
                <TableCell sx={tableHeaderCellSx}>Type</TableCell>
                <TableCell sx={tableHeaderCellSx}>Status</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, display: { xs: 'none', md: 'table-cell' } }}>Dates</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, display: { xs: 'none', sm: 'table-cell' } }}>Amount</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, display: { xs: 'none', md: 'table-cell' } }}>Project</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((f) => (
                <TableRow key={f.id} hover sx={tableRowSx} onClick={() => setSelectedId(f.id)}>
                  <TableCell sx={tableBodyCellSx}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#fafafa' }}>
                      {f.userName || f.userEmail || '—'}
                    </Typography>
                    {f.userEmail && (
                      <Typography variant="caption" sx={{ color: '#71717a' }}>{f.userEmail}</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={tableBodyCellSx}>{f.type}</TableCell>
                  <TableCell sx={tableBodyCellSx}>
                    <StatusChip status={f.status} />
                  </TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, display: { xs: 'none', md: 'table-cell' }, color: '#a1a1aa' }}>
                    {f.startDate && f.endDate
                      ? `${new Date(f.startDate).toLocaleDateString()} – ${new Date(f.endDate).toLocaleDateString()}`
                      : '—'}
                  </TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                    {formatAmount(f.amountUsd)}
                  </TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, display: { xs: 'none', md: 'table-cell' } }}>
                    {f.projectName || '—'}
                  </TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, textAlign: 'right' }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={(e) => { e.stopPropagation(); setSelectedId(f.id); }}
                      sx={{ color: '#fb923c', '&:hover': { bgcolor: 'rgba(249,115,22,0.08)' } }}
                    >
                      {f.status === FellowshipStatus.PENDING ? 'Start contract' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
          <Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} color="primary" />
        </Stack>
      )}

      <Drawer anchor="right" open={!!selectedId} onClose={() => setSelectedId(null)}>
        {selectedId && (
          <FellowshipDetail
            id={selectedId}
            onClose={() => setSelectedId(null)}
            onToast={(msg) => setToast(msg)}
          />
        )}
      </Drawer>
    </FellowshipPageLayout>
  );
};

export default FellowshipsAdmin;
