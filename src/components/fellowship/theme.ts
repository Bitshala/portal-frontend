import { createTheme } from '@mui/material/styles';

const ORANGE = '#f97316';
const ORANGE_DARK = '#ea580c';
const ORANGE_LIGHT = '#fb923c';

export const fellowshipLightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: ORANGE,
      dark: ORANGE_DARK,
      light: ORANGE_LIGHT,
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#18181b',
      secondary: '#52525b',
    },
    divider: '#e4e4e7',
    success: { main: '#16a34a' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    info: { main: '#2563eb' },
  },
  typography: {
    fontFamily: 'Sora, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
          fontWeight: 600,
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          color: '#ffffff',
          backgroundColor: ORANGE,
          '&:hover': { backgroundColor: ORANGE_DARK },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          '& fieldset': { borderColor: '#e4e4e7' },
          '&:hover fieldset': { borderColor: '#d4d4d8' },
          '&.Mui-focused fieldset': { borderColor: ORANGE, borderWidth: 1.5 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, letterSpacing: 0.2 },
      },
    },
  },
});
