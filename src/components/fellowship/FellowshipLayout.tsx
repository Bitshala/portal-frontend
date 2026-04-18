import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, Typography, Button, Stack, Container } from '@mui/material';
import { fellowshipLightTheme } from './theme';
import { useUser } from '../../hooks/userHooks';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/enums';

interface Props {
  children: ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | false;
}

const navLinks = (role: UserRole | undefined) => {
  const base = [
    { label: 'Apply', path: '/fellowship/apply' },
    { label: 'My Fellowships', path: '/fellowship/me' },
  ];
  if (role === UserRole.ADMIN || role === UserRole.TEACHING_ASSISTANT) {
    return [...base, { label: 'Admin', path: '/admin/fellowships' }];
  }
  return base;
};

export const FellowshipLayout = ({ children, title, maxWidth = 'lg' }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useUser();
  const { logout } = useAuth();

  const links = navLinks(user?.role);

  return (
    <ThemeProvider theme={fellowshipLightTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
        <Box
          component="header"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: '#ffffff',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', py: 1.5, gap: 3 }}>
            <Typography
              onClick={() => navigate('/fellowship/apply')}
              variant="h6"
              sx={{ fontWeight: 700, cursor: 'pointer', color: 'primary.main' }}
            >
              Fellowship
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
              {links.map((l) => {
                const active = location.pathname === l.path || location.pathname.startsWith(l.path + '/');
                return (
                  <Button
                    key={l.path}
                    onClick={() => navigate(l.path)}
                    size="small"
                    sx={{
                      color: active ? 'primary.main' : 'text.secondary',
                      bgcolor: active ? 'rgba(249,115,22,0.08)' : 'transparent',
                      '&:hover': { bgcolor: 'rgba(249,115,22,0.08)', color: 'primary.main' },
                      px: 1.5,
                    }}
                  >
                    {l.label}
                  </Button>
                );
              })}
            </Stack>
            {user && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {user.name || user.discordUsername}
                </Typography>
                <Button variant="text" size="small" onClick={logout} sx={{ color: 'text.secondary' }}>
                  Logout
                </Button>
              </Stack>
            )}
          </Container>
        </Box>

        <Container maxWidth={maxWidth as 'lg'} sx={{ py: { xs: 3, md: 5 } }}>
          {title && (
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
              {title}
            </Typography>
          )}
          {children}
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default FellowshipLayout;
