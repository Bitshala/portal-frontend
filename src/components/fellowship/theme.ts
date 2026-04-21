import { createTheme } from '@mui/material/styles';

const ORANGE = '#f97316';
const ORANGE_DARK = '#ea580c';
const ORANGE_LIGHT = '#fb923c';

export const fellowshipDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: ORANGE,
      dark: ORANGE_DARK,
      light: ORANGE_LIGHT,
      contrastText: '#ffffff',
    },
    background: {
      default: '#000000',
      paper: '#18181b',
    },
    text: {
      primary: '#fafafa',
      secondary: '#a1a1aa',
    },
    divider: '#27272a',
    success: { main: '#4ade80' },
    warning: { main: '#fbbf24' },
    error: { main: '#f87171' },
    info: { main: '#60a5fa' },
  },
  typography: {
    fontFamily: 'Sora, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#000000' },
      },
    },
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
          backgroundColor: '#18181b',
          '& fieldset': { borderColor: '#3f3f46' },
          '&:hover fieldset': { borderColor: '#52525b' },
          '&.Mui-focused fieldset': { borderColor: ORANGE, borderWidth: 1.5 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, letterSpacing: 0.2 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid #27272a' },
        head: { color: '#a1a1aa', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.4 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#18181b',
          backgroundImage: 'none',
          border: '1px solid #27272a',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: '#0f0f0f', backgroundImage: 'none' },
      },
    },
  },
});

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
