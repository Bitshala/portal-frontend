import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  CssBaseline,
  Stack,
  ThemeProvider,
  Typography,
} from '@mui/material';
import { FileText, Award, ClipboardList } from 'lucide-react';
import { fellowshipLightTheme } from './theme';
import { useUser } from '../../hooks/userHooks';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  children: ReactNode;
  title?: string;
}

const NAV_ITEMS = [
  { label: 'Applications', path: '/admin/fellowships/applications', icon: FileText },
  { label: 'Fellowships', path: '/admin/fellowships', icon: Award },
  { label: 'Reports', path: '/admin/fellowships/reports', icon: ClipboardList },
];

const SIDEBAR_WIDTH = 240;

export const AdminFellowshipLayout = ({ children, title }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useUser();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/admin/fellowships') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <ThemeProvider theme={fellowshipLightTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', display: 'flex' }}>
        <Box
          component="aside"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: '#ffffff',
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            p: 2,
          }}
        >
          <Typography
            onClick={() => navigate('/admin/fellowships')}
            variant="h6"
            sx={{ fontWeight: 700, cursor: 'pointer', color: 'primary.main', mb: 1, px: 1 }}
          >
            Fellowship Admin
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', px: 1, mb: 2 }}>
            Scouting portal
          </Typography>

          <Stack spacing={0.5} sx={{ flex: 1 }}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  startIcon={<Icon size={16} />}
                  sx={{
                    justifyContent: 'flex-start',
                    color: active ? 'primary.main' : 'text.secondary',
                    bgcolor: active ? 'rgba(249,115,22,0.08)' : 'transparent',
                    fontWeight: active ? 600 : 500,
                    px: 1.5,
                    py: 1,
                    '&:hover': { bgcolor: 'rgba(249,115,22,0.08)', color: 'primary.main' },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>

          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              onClick={() => navigate('/fellowship/apply')}
              size="small"
              sx={{ color: 'text.secondary', textTransform: 'none', px: 1 }}
            >
              ← Back to fellowship
            </Button>
            {user && (
              <Stack spacing={0.5} sx={{ mt: 1, px: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {user.name || user.discordUsername}
                </Typography>
                <Button variant="text" size="small" onClick={logout} sx={{ justifyContent: 'flex-start', px: 0, color: 'text.secondary' }}>
                  Logout
                </Button>
              </Stack>
            )}
          </Box>
        </Box>

        <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
          <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
            {title && (
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
                {title}
              </Typography>
            )}
            {children}
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AdminFellowshipLayout;
