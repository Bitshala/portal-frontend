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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amountUsd, setAmountUsd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const startMut = useStartFellowshipContract();

  const validate = () => {
    if (!startDate || !endDate || !amountUsd) return 'All fields required.';
    if (new Date(endDate) <= new Date(startDate)) return 'End date must be after start date.';
    const n = Number(amountUsd);
    if (Number.isNaN(n) || n <= 0) return 'Amount must be positive.';
    if (!/^\d+(\.\d{1,2})?$/.test(amountUsd)) return 'Amount supports up to 2 decimals.';
    return null;
  };

  const reset = () => {
    setStartDate('');
    setEndDate('');
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
        body: { startDate, endDate, amountUsd: Number(amountUsd) },
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
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
            label="Amount (USD, per month)"
            size="small"
            fullWidth
            value={amountUsd}
            onChange={(e) => setAmountUsd(e.target.value)}
            placeholder="500.00"
          />
        </Stack>
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
