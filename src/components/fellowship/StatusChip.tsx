import { Chip } from '@mui/material';
import {
  FellowshipApplicationStatus,
  FellowshipReportStatus,
  FellowshipStatus,
} from '../../types/fellowship';

type AnyStatus =
  | FellowshipApplicationStatus
  | FellowshipStatus
  | FellowshipReportStatus;

const COLOR_MAP: Record<string, { bg: string; color: string; border: string }> = {
  // grey — draft
  DRAFT: { bg: '#f4f4f5', color: '#52525b', border: '#e4e4e7' },
  // amber — awaiting action
  SUBMITTED: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  PENDING: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  // green — good
  ACCEPTED: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  ACTIVE: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  APPROVED: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  // red — bad
  REJECTED: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  // blue — closed
  COMPLETED: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
};

interface Props {
  status: AnyStatus;
  size?: 'small' | 'medium';
}

export const StatusChip = ({ status, size = 'small' }: Props) => {
  const palette = COLOR_MAP[status] ?? COLOR_MAP.DRAFT;
  return (
    <Chip
      size={size}
      label={status}
      sx={{
        bgcolor: palette.bg,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        fontSize: '0.7rem',
        height: size === 'small' ? 22 : 28,
        letterSpacing: 0.4,
      }}
    />
  );
};

export default StatusChip;
