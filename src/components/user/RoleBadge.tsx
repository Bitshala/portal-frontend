import { Chip } from '@mui/material';
import type { UserRole } from '../../types/enums.ts';
import { USER_ROLE_COLORS, formatUserRole } from '../../utils/userFormat.ts';

interface Props {
  role: UserRole | string;
  size?: 'small' | 'medium';
}

const FALLBACK = { bg: 'rgba(161,161,170,0.12)', color: '#d4d4d8', border: 'rgba(161,161,170,0.25)' };

// Role pill mirroring StatusChip — used in the user search rows and the overview header.
export const RoleBadge = ({ role, size = 'small' }: Props) => {
  const palette = USER_ROLE_COLORS[role as UserRole] ?? FALLBACK;
  return (
    <Chip
      size={size}
      label={formatUserRole(role)}
      sx={{
        bgcolor: palette.bg,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        fontSize: '0.7rem',
        height: size === 'small' ? 22 : 28,
        letterSpacing: 0.4,
        fontWeight: 600,
      }}
    />
  );
};

export default RoleBadge;
