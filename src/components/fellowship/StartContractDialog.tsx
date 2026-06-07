import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useStartFellowshipContract } from '../../hooks/fellowshipHooks';
import type { GetFellowshipResponseDto } from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';

type Props = {
  fellowship: GetFellowshipResponseDto | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
};

const StartContractDialog = ({ fellowship, onClose, onSuccess, onError }: Props) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [amountUsd, setAmountUsd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const startMut = useStartFellowshipContract();

  // The picker already blocks invalid end dates via minDate; this guards
  // typed input and keeps the rule explicit.
  const validate = () => {
    if (!startDate || !endDate || !amountUsd) return 'All fields required.';
    if (!startDate.isValid() || !endDate.isValid()) return 'Enter valid dates.';
    if (!endDate.isAfter(startDate, 'day')) return 'End date must be after start date.';
    const n = Number(amountUsd);
    if (Number.isNaN(n) || n <= 0) return 'Amount must be positive.';
    if (!/^\d+(\.\d{1,2})?$/.test(amountUsd)) return 'Amount supports up to 2 decimals.';
    return null;
  };

  const reset = () => {
    setStartDate(null);
    setEndDate(null);
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
        body: {
          startDate: startDate!.format('YYYY-MM-DD'),
          endDate: endDate!.format('YYYY-MM-DD'),
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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <DatePicker
                label="Start date"
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  // Keep the range valid if the start moves past the end.
                  if (v && endDate && !endDate.isAfter(v, 'day')) setEndDate(null);
                }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <DatePicker
                label="End date"
                value={endDate}
                onChange={setEndDate}
                minDate={startDate ? startDate.add(1, 'day') : dayjs()}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
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
        <Button variant="contained" onClick={handleSubmit} disabled={startMut.isPending}>
          {startMut.isPending ? 'Starting…' : 'Start contract'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StartContractDialog;
