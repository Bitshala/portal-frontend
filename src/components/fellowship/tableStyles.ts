import type { SxProps, Theme } from '@mui/material';

export const adminCardSx: SxProps<Theme> = {
  bgcolor: 'rgba(39,39,42,0.5)',
  borderRadius: 3,
  border: '1px solid rgba(249,115,22,0.2)',
  overflow: 'hidden',
};

export const adminToolbarSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'flex-end' },
  justifyContent: 'space-between',
  px: { xs: 2, sm: 3 },
  pt: 1.5,
  gap: 1.5,
};

export const tableHeaderCellSx: SxProps<Theme> = {
  color: '#71717a',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid rgba(63,63,70,0.5)',
  py: 2,
  px: 3,
  whiteSpace: 'nowrap',
};

export const tableBodyCellSx: SxProps<Theme> = {
  borderBottom: '1px solid rgba(63,63,70,0.3)',
  py: 2.5,
  px: 3,
  color: '#d4d4d8',
};

export const tableRowSx: SxProps<Theme> = {
  cursor: 'pointer',
  '&:hover': { bgcolor: 'rgba(63,63,70,0.3)' },
  transition: 'background-color 150ms',
};

export const emptyStateSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  py: 10,
  color: '#71717a',
};
