import { useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Dayjs } from 'dayjs';
import { useStartFellowshipContract } from '../../hooks/fellowshipHooks';
import type { GetFellowshipResponseDto } from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';

type Props = {
  fellowship: GetFellowshipResponseDto | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
};

// Mirrors @Max(5000) on StartFellowshipContractDto in the backend.
const MAX_AMOUNT_USD = 5000;
const MAX_MONTHS = 24;

// Field-level validators return the error to show, or null. They run on every
// keystroke so mistakes surface immediately, not on submit.
const validateMonths = (raw: string): string | null => {
  if (!raw.trim()) return null;
  if (!/^\d+$/.test(raw.trim())) return 'Enter a whole number of months.';
  const n = Number(raw);
  if (n < 1) return 'Duration must be at least 1 month.';
  if (n > MAX_MONTHS) return `Duration cannot exceed ${MAX_MONTHS} months.`;
  return null;
};

const validateAmount = (raw: string): string | null => {
  if (!raw.trim()) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return 'Enter a numeric amount.';
  if (n <= 0) return 'Amount must be positive.';
  if (n > MAX_AMOUNT_USD)
    return `Amount cannot exceed $${MAX_AMOUNT_USD.toLocaleString('en-US')}/mo.`;
  if (!/^\d+(\.\d{1,2})?$/.test(raw.trim())) return 'Amount supports up to 2 decimals.';
  return null;
};

const StartContractDialog = ({ fellowship, onClose, onSuccess, onError }: Props) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [months, setMonths] = useState('6');
  const [amountUsd, setAmountUsd] = useState('');
  const startMut = useStartFellowshipContract();

  const monthsError = validateMonths(months);
  const amountError = validateAmount(amountUsd);
  const startDateError =
    startDate && !startDate.isValid() ? 'Enter a valid date.' : null;

  // Display-only preview of when the contract ends. The backend derives the
  // real end date from startDate + periodMonths, so this is never submitted.
  const endDate = useMemo(() => {
    if (!startDate || !startDate.isValid() || monthsError || !months.trim()) return null;
    return startDate.add(Number(months), 'month');
  }, [startDate, months, monthsError]);

  const canSubmit =
    !!startDate &&
    !startDateError &&
    !!months.trim() &&
    !monthsError &&
    !!amountUsd.trim() &&
    !amountError &&
    !startMut.isPending;

  const reset = () => {
    setStartDate(null);
    setMonths('6');
    setAmountUsd('');
  };

  const handleSubmit = async () => {
    if (!fellowship || !canSubmit || !endDate) return;
    try {
      await startMut.mutateAsync({
        id: fellowship.id,
        body: {
          startDate: startDate!.format('YYYY-MM-DD'),
          periodMonths: Number(months),
          amountUsd: Number(amountUsd),
        },
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
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DatePicker
                label="Start date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    error: !!startDateError,
                    helperText: startDateError ?? ' ',
                  },
                }}
              />
              <TextField
                label="Duration (months)"
                size="small"
                fullWidth
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="6"
                error={!!monthsError}
                helperText={monthsError ?? `Up to ${MAX_MONTHS} months.`}
              />
            </Stack>
            <TextField
              label="Amount (USD, per month)"
              size="small"
              fullWidth
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              placeholder="500.00"
              error={!!amountError}
              helperText={
                amountError ?? `Up to $${MAX_AMOUNT_USD.toLocaleString('en-US')}/mo.`
              }
            />
            {endDate && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Contract ends{' '}
                <Typography component="span" variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  {endDate.format('MMM D, YYYY')}
                </Typography>
                .
              </Typography>
            )}
          </Stack>
        </LocalizationProvider>
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
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
          {startMut.isPending ? 'Starting…' : 'Start contract'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StartContractDialog;
