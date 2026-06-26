import type { ReactNode } from 'react';
import type { CohortRow } from '../../types/cohort';
export type { CohortRow };
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import StatusBadge from './StatusBadge';

type CohortTableProps = {
  cohorts: CohortRow[];
  onRowClick?: (cohort: CohortRow) => void;
  actions?: (cohort: CohortRow) => ReactNode;
  loading?: boolean;
  emptyMessage?: ReactNode;
};

const formatDate = (iso: string): string => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '-';
  }
};

const headerCellSx = {
  color: '#71717a',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '1px solid rgba(63,63,70,0.5)',
  py: 2,
  px: 3,
  whiteSpace: 'nowrap' as const,
};

const bodyCellSx = {
  borderBottom: '1px solid rgba(63,63,70,0.3)',
  py: 2.5,
  px: 3,
};

const CohortTable = ({
  cohorts,
  onRowClick,
  actions,
  loading = false,
  emptyMessage = 'No cohorts found.',
}: CohortTableProps) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 10 }}>
        <CircularProgress size={36} sx={{ color: '#f97316' }} />
        <Typography variant="body2" sx={{ color: '#71717a' }}>Loading cohorts...</Typography>
      </Box>
    );
  }

  if (cohorts.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10, px: 2 }}>
        {typeof emptyMessage === 'string' ? (
          <Typography variant="body2" sx={{ color: '#71717a' }}>{emptyMessage}</Typography>
        ) : emptyMessage}
      </Box>
    );
  }

  const hasWeeks = cohorts.some((c) => c.weeks !== undefined);
  const hasProgress = cohorts.some((c) => c.completedWeeks !== undefined);
  const hasParticipants = cohorts.some((c) => c.participants !== undefined);
  const hasApplications = cohorts.some((c) => c.applications !== undefined);

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headerCellSx, maxWidth: 220 }}>Cohort</TableCell>
            <TableCell sx={headerCellSx}>Season</TableCell>
            <TableCell sx={headerCellSx}>Status</TableCell>
            {hasWeeks && (
              <TableCell sx={{ ...headerCellSx, display: { xs: 'none', sm: 'table-cell' } }}>Weeks</TableCell>
            )}
            {hasProgress && (
              <TableCell sx={{ ...headerCellSx, display: { xs: 'none', sm: 'table-cell' }, minWidth: 160 }}>Progress</TableCell>
            )}
            {hasParticipants && (
              <TableCell sx={{ ...headerCellSx, display: { xs: 'none', sm: 'table-cell' } }}>Participants</TableCell>
            )}
            {hasApplications && (
              <TableCell sx={{ ...headerCellSx, display: { xs: 'none', sm: 'table-cell' } }}>Applications</TableCell>
            )}
            <TableCell sx={{ ...headerCellSx, display: { xs: 'none', md: 'table-cell' } }}>Start Date</TableCell>
            <TableCell sx={{ ...headerCellSx, display: { xs: 'none', md: 'table-cell' } }}>End Date</TableCell>
            {actions && <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {cohorts.map((cohort) => (
            <TableRow
              key={cohort.id}
              hover
              onClick={() => onRowClick?.(cohort)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': { bgcolor: 'rgba(63,63,70,0.3)' },
                transition: 'background-color 150ms',
              }}
            >
              <TableCell sx={{ ...bodyCellSx, maxWidth: 220 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: '#fafafa',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                  }}
                  title={cohort.name}
                >
                  {cohort.name}
                </Typography>
              </TableCell>
              <TableCell sx={bodyCellSx}>
                <Typography variant="body2" sx={{ color: '#d4d4d8' }}>S{cohort.season}</Typography>
              </TableCell>
              <TableCell sx={bodyCellSx}>
                <StatusBadge status={cohort.status} />
              </TableCell>
              {hasWeeks && (
                <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                  <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
                    {cohort.weeks !== undefined ? cohort.weeks : '-'}
                  </Typography>
                </TableCell>
              )}
              {hasProgress && (
                <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                  {cohort.completedWeeks !== undefined && cohort.weeks ? (
                    <Box sx={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      {Array.from({ length: cohort.weeks }, (_, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 10,
                            height: 18,
                            borderRadius: '3px',
                            bgcolor: i < cohort.completedWeeks! ? '#facc15' : '#3f3f46',
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#71717a' }}>-</Typography>
                  )}
                </TableCell>
              )}
              {hasParticipants && (
                <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                  <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
                    {cohort.participants !== undefined ? cohort.participants : '-'}
                  </Typography>
                </TableCell>
              )}
              {hasApplications && (
                <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                  <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
                    {cohort.applications !== undefined ? cohort.applications : '-'}
                  </Typography>
                </TableCell>
              )}
              <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', md: 'table-cell' } }}>
                <Typography variant="body2" sx={{ color: '#a1a1aa' }}>{formatDate(cohort.startDate)}</Typography>
              </TableCell>
              <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', md: 'table-cell' } }}>
                <Typography variant="body2" sx={{ color: '#a1a1aa' }}>{formatDate(cohort.endDate)}</Typography>
              </TableCell>
              {actions && (
                <TableCell sx={{ ...bodyCellSx, textAlign: 'right' }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions(cohort)}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CohortTable;
