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

export const tableScrollSx: SxProps<Theme> = {
  width: '100%',
  overflowX: 'auto',
  overflowY: 'auto',
  maxHeight: 'calc(100vh - 280px)',
  '&::-webkit-scrollbar': {
    height: 10,
    width: 10,
  },
  '&::-webkit-scrollbar-track': {
    bgcolor: 'rgba(24,24,27,0.6)',
  },
  '&::-webkit-scrollbar-thumb': {
    bgcolor: 'rgba(82,82,91,0.6)',
    borderRadius: 5,
    '&:hover': { bgcolor: 'rgba(113,113,122,0.8)' },
  },
};

export const tableSx: SxProps<Theme> = {
  minWidth: 'max-content',
  borderCollapse: 'separate',
  borderSpacing: 0,
};

export const tableHeaderCellSx: SxProps<Theme> = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  bgcolor: '#1f1410',
  color: '#fb923c',
  fontWeight: 700,
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid rgba(249,115,22,0.3)',
  py: 1.75,
  px: 2.5,
  whiteSpace: 'nowrap',
};

export const tableBodyCellSx: SxProps<Theme> = {
  borderBottom: '1px solid rgba(63,63,70,0.25)',
  py: 1.75,
  px: 2.5,
  color: '#d4d4d8',
  fontSize: '0.8125rem',
  whiteSpace: 'nowrap',
  maxWidth: 320,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const tableRowSx: SxProps<Theme> = {
  cursor: 'pointer',
  transition: 'background-color 120ms',
  '&:nth-of-type(odd)': {
    bgcolor: 'rgba(24,24,27,0.4)',
  },
  '&:nth-of-type(even)': {
    bgcolor: 'rgba(39,39,42,0.25)',
  },
  '&:hover': {
    bgcolor: 'rgba(249,115,22,0.08) !important',
  },
};

export const emptyStateSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  py: 10,
  color: '#71717a',
};
