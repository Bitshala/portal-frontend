import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export type FellowshipTab = {
  label: string;
  path: string;
  admin?: boolean;
};

const TABS: FellowshipTab[] = [
  { label: 'Apply', path: '/fellowship/apply' },
  { label: 'My fellowships', path: '/fellowship/me' },
  { label: 'Applications', path: '/admin/fellowships/applications', admin: true },
  { label: 'Manage', path: '/admin/fellowships', admin: true },
  { label: 'Reports', path: '/admin/fellowships/reports', admin: true },
];

interface Props {
  active: string;
}

export const FellowshipTopTabs = ({ active }: Props) => {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        borderBottom: '1px solid',
        borderColor: 'divider',
        mb: 2.5,
        overflowX: 'auto',
      }}
    >
      {TABS.map((t) => {
        const isActive = t.label === active;
        return (
          <Box
            key={t.label}
            onClick={() => !isActive && navigate(t.path)}
            sx={{
              py: 1.25,
              px: 0.5,
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 0.6,
              borderBottom: '2px solid',
              borderColor: isActive ? 'primary.main' : 'transparent',
              color: isActive ? 'primary.main' : 'text.secondary',
              fontWeight: 600,
              fontSize: '0.92rem',
              whiteSpace: 'nowrap',
              cursor: isActive ? 'default' : 'pointer',
              '&:hover': isActive ? {} : { color: 'text.primary' },
            }}
          >
            {t.label}
            {t.admin && (
              <Box
                component="span"
                sx={{
                  fontSize: '0.62rem',
                  letterSpacing: 1,
                  color: isActive ? 'primary.light' : 'text.secondary',
                  opacity: isActive ? 1 : 0.6,
                  fontWeight: 700,
                }}
              >
                ADMIN
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default FellowshipTopTabs;
