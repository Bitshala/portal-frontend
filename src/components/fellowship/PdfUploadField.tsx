import { useRef, useState, type ChangeEvent } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { FileText, Upload, X } from 'lucide-react';

// Mirrors the backend cap (≤ 15 MB, PDF only). The server still re-checks the
// magic bytes; this is a fast-feedback guard, not the source of truth.
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

const validatePdf = (file: File): string | null => {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Only PDF files are allowed.';
  if (file.size > MAX_SIZE_BYTES) return 'File must be 15 MB or smaller.';
  return null;
};

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
  // External error (e.g. a server-side rejection) shown in place of the hint.
  error?: string | null;
  disabled?: boolean;
  label?: string;
};

// Reusable PDF picker: hidden <input> behind an MUI button, with client-side
// type/size validation. Used by the admin accept dialog and the fellow
// documents page. Only ever hands a *valid* PDF back through onChange.
const PdfUploadField = ({ file, onChange, error, disabled, label = 'Choose PDF' }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handlePick = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    // Clear the input so re-picking the same file still fires onChange.
    e.target.value = '';
    if (!picked) return;
    const err = validatePdf(picked);
    if (err) {
      setLocalError(err);
      onChange(null);
      return;
    }
    setLocalError(null);
    onChange(picked);
  };

  const shownError = localError ?? error ?? null;

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={handlePick}
        disabled={disabled}
      />
      {file ? (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0.75,
            px: 1.5,
            py: 1,
            bgcolor: 'rgba(255,255,255,0.02)',
          }}
        >
          <FileText size={16} color="#fb923c" />
          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: '0.84rem',
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {file.name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
            {(file.size / (1024 * 1024)).toFixed(1)} MB
          </Typography>
          {!disabled && (
            <IconButton
              size="small"
              aria-label="Remove file"
              onClick={() => {
                setLocalError(null);
                onChange(null);
              }}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <X size={14} />
            </IconButton>
          )}
        </Stack>
      ) : (
        <Button
          variant="outlined"
          startIcon={<Upload size={15} />}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          sx={{ color: 'text.primary', borderColor: 'divider', textTransform: 'none' }}
        >
          {label}
        </Button>
      )}
      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 0.75, color: shownError ? 'error.main' : 'text.secondary' }}
      >
        {shownError ?? 'PDF only, up to 15 MB.'}
      </Typography>
    </Box>
  );
};

export default PdfUploadField;
