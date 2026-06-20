import { Chip } from '@mui/material';
import {
  FellowshipApplicationStatus,
  FellowshipDocumentStatus,
  FellowshipReportStatus,
  FellowshipStatus,
} from '../../types/fellowship';

type AnyStatus =
  | FellowshipApplicationStatus
  | FellowshipStatus
  | FellowshipReportStatus
  | FellowshipDocumentStatus;

const COLOR_MAP: Record<string, { bg: string; color: string; border: string }> = {
  // grey — draft / nothing yet
  DRAFT: { bg: 'rgba(161,161,170,0.12)', color: '#d4d4d8', border: 'rgba(161,161,170,0.25)' },
  AWAITING_UPLOAD: { bg: 'rgba(161,161,170,0.12)', color: '#d4d4d8', border: 'rgba(161,161,170,0.25)' },
  // amber — awaiting action
  SUBMITTED: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  PENDING: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  AWAITING_DOCUMENTS: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  DOCUMENTS_IN_REVIEW: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  PENDING_REVIEW: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  // orange — needs revision
  CHANGES_REQUESTED: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c', border: 'rgba(251,146,60,0.3)' },
  // green — good
  ACCEPTED: { bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
  ACTIVE: { bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
  APPROVED: { bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
  DOCUMENTS_APPROVED: { bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
  // red — bad
  REJECTED: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'rgba(248,113,113,0.3)' },
  // blue — closed
  COMPLETED: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
};

const LABEL_MAP: Record<string, string> = {
  CHANGES_REQUESTED: 'Changes requested',
  // "Submitted" reads as a dead end to applicants; "Under review" tells them
  // what is actually happening. Applies to reports too — same semantics.
  SUBMITTED: 'Under review',
  AWAITING_DOCUMENTS: 'Awaiting documents',
  DOCUMENTS_IN_REVIEW: 'Documents in review',
  DOCUMENTS_APPROVED: 'Documents approved',
  AWAITING_UPLOAD: 'Awaiting upload',
  PENDING_REVIEW: 'Under review',
};

interface Props {
  status: AnyStatus;
  size?: 'small' | 'medium';
}

export const StatusChip = ({ status, size = 'small' }: Props) => {
  const palette = COLOR_MAP[status] ?? COLOR_MAP.DRAFT;
  const label = LABEL_MAP[status] ?? status;
  return (
    <Chip
      size={size}
      label={label}
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
