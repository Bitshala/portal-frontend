import type { ReactNode } from 'react';
import { Box, Chip, CssBaseline, ThemeProvider, Typography } from '@mui/material';
import { Award } from 'lucide-react';
import { fellowshipDarkTheme } from './theme';

interface Props {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  badge?: string;
}

export const FellowshipPageLayout = ({ children, title, subtitle, badge }: Props) => {
  return (
    <ThemeProvider theme={fellowshipDarkTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#000',
          color: '#fafafa',
          px: { xs: 2, md: 5, lg: 8 },
          py: 3,
          fontFamily: 'Sora, sans-serif',
        }}
      >
        {title && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
              mb: 4,
            }}
          >
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: 'rgba(249,115,22,0.15)',
                border: '1px solid rgba(249,115,22,0.25)',
                flexShrink: 0,
              }}
            >
              <Award size={24} color="#fb923c" />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: '#fafafa',
                    fontSize: { xs: '1.5rem', md: '1.75rem' },
                  }}
                >
                  {title}
                </Typography>
                {badge && (
                  <Chip
                    label={badge}
                    size="small"
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      bgcolor: 'rgba(249,115,22,0.15)',
                      color: '#fb923c',
                      border: '1px solid rgba(249,115,22,0.25)',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                )}
              </Box>
              {subtitle && (
                <Typography variant="body2" sx={{ color: '#71717a', mt: 0.5 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
        )}
        {children}
      </Box>
    </ThemeProvider>
  );
};

export default FellowshipPageLayout;
