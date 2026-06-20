import { Box } from '@mui/material';

/**
 * Compact clickable pill for external links (portfolio, GitHub, prior work).
 * Opens in a new tab; stops propagation so it works inside clickable rows.
 */
export const LinkChip = ({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <Box
    component="a"
    href={href}
    target="_blank"
    rel="noreferrer"
    onClick={(e) => e.stopPropagation()}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1.25,
      py: 0.5,
      borderRadius: 0.5,
      border: '1px solid',
      borderColor: 'divider',
      color: 'text.primary',
      fontSize: '0.78rem',
      textDecoration: 'none',
      transition: 'border-color 0.15s, color 0.15s',
      '&:hover': { borderColor: 'primary.light', color: 'primary.light' },
    }}
  >
    {icon}
    <Box component="span" sx={{ wordBreak: 'break-all' }}>
      {label}
    </Box>
  </Box>
);

export default LinkChip;
