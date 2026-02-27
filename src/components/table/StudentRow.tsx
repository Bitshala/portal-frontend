import React from 'react';
import {
  TableRow,
  TableCell,
  Avatar,
  Chip,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Info } from 'lucide-react';
import type { TableRowData } from '../../types/student';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

interface StudentRowProps {
  person: TableRowData;
  week: number;
  showAttendance?: boolean;
  showGdScores?: boolean;
  showBonusScores?: boolean;
  showExerciseScores?: boolean;
  onStudentClick: (student: TableRowData) => void;
  onEditStudent: (student: TableRowData) => void;
  onContextMenu: (menu: {
    visible: boolean;
    x: number;
    y: number;
    targetId: number | null;
  }) => void;
}

const cellSx = {
  whiteSpace: 'nowrap' as const,
  py: 2,
  px: 2,
};

const tooltipSx = {
  tooltip: {
    sx: {
      bgcolor: '#18181b',
      color: '#e4e4e7',
      fontSize: '0.8rem',
      p: 1.5,
      maxWidth: 280,
      '& .MuiTooltip-arrow': { color: '#18181b' },
    },
  },
};

export const StudentRow: React.FC<StudentRowProps> = ({
  person,
  week,
  showAttendance = false,
  showGdScores = true,
  showBonusScores = true,
  showExerciseScores = true,
  onStudentClick,
  onEditStudent,
  onContextMenu,
}) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditStudent(person);
  };

  const handleNameRightClick = (
    event: React.MouseEvent<HTMLTableCellElement>
  ) => {
    event.preventDefault();
    const studentId = person.userId ?? person.id;
    onContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      targetId: studentId,
    });
  };

  const fetchStudentRepoLink = async (week: number, studentName: string) => {
    try {
      const response = await fetch(
        `${baseUrl}/students/${week}/${encodeURIComponent(studentName)}`
      );

      if (!response.ok) {
        console.error(`Server Error ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('fetchStudentRepoLink error:', err);
    }
  };

  const initials = `${person.discordGlobalName.charAt(0)}${(person.discordGlobalName.split(' ')[1]?.charAt(0) || '').toUpperCase()}`;

  // GD score summary
  const gdTotal = person.gdScore
    ? person.gdScore.fa + person.gdScore.fb + person.gdScore.fc + person.gdScore.fd
    : null;

  const gdTooltipContent = person.gdScore ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, color: '#fed7aa' }}>
        GD Score Breakdown
      </Typography>
      <Typography variant="caption">Communication: {person.gdScore.fa}/5</Typography>
      <Typography variant="caption">Depth of Answer: {person.gdScore.fb}/5</Typography>
      <Typography variant="caption">Technical Fluency: {person.gdScore.fc}/5</Typography>
      <Typography variant="caption">Engagement: {person.gdScore.fd}/5</Typography>
    </Box>
  ) : null;

  // Bonus score summary
  const bonusTotal = person.bonusScore
    ? person.bonusScore.good + person.bonusScore.followUp
    : null;

  const bonusTooltipContent = person.bonusScore ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, color: '#fed7aa' }}>
        Bonus Score Breakdown
      </Typography>
      <Typography variant="caption">
        Attempted: {person.bonusScore.attempt > 0 ? 'Yes' : 'No'}
      </Typography>
      <Typography variant="caption">Answer Quality: {person.bonusScore.good}/5</Typography>
      <Typography variant="caption">Follow Up: {person.bonusScore.followUp}/5</Typography>
    </Box>
  ) : null;

  // Exercise score summary
  const exerciseTooltipContent = person.exerciseScore ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, color: '#fed7aa' }}>
        Exercise Breakdown
      </Typography>
      <Typography variant="caption">
        Submitted: {person.exerciseScore.Submitted ? 'Yes' : 'No'}
      </Typography>
      <Typography variant="caption">
        Tests Passing: {person.exerciseScore.privateTest ? 'Yes' : 'No'}
      </Typography>
    </Box>
  ) : null;

  return (
    <TableRow
      hover
      sx={{
        cursor: 'pointer',
        '&:hover': { backgroundColor: '#fafafa' },
        transition: 'background-color 150ms',
      }}
    >
      {/* Name - shows discordGlobalName */}
      <TableCell
        sx={{ ...cellSx, cursor: 'pointer', px: 3 }}
        onClick={() => onStudentClick(person)}
        onContextMenu={handleNameRightClick}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: '#f97316',
              width: 36,
              height: 36,
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {initials}
          </Avatar>
          <Typography variant="body2" fontWeight={500} color="text.primary">
            {person.discordGlobalName}
          </Typography>
        </Box>
      </TableCell>

      {/* Discord Username */}
      <TableCell sx={{ ...cellSx, display: { xs: 'none', sm: 'table-cell' } }}>
        <Typography variant="body2" color="text.primary">
          {person.email || '-'}
        </Typography>
      </TableCell>

      {/* Group */}
      {week > 0 && (
        <TableCell sx={{ ...cellSx, display: { xs: 'none', sm: 'table-cell' } }}>
          <Typography variant="body2" color="text.primary">
            {person.group}
          </Typography>
        </TableCell>
      )}

      {/* TA */}
      <TableCell sx={{ ...cellSx, display: { xs: 'none', md: 'table-cell' } }}>
        <Typography variant="body2" color="text.secondary">
          {person.ta || '-'}
        </Typography>
      </TableCell>

      {/* Attendance */}
      {showAttendance && (
        <TableCell sx={{ ...cellSx, display: { xs: 'none', lg: 'table-cell' } }}>
          <Chip
            label={person.attendance ? 'Present' : 'Absent'}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              backgroundColor: person.attendance ? '#dcfce7' : '#fee2e2',
              color: person.attendance ? '#166534' : '#991b1b',
            }}
          />
        </TableCell>
      )}

      {/* GD Score - collapsed */}
      {showGdScores && (
        <TableCell align="center" sx={cellSx}>
          {person.gdScore ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {gdTotal}/20
              </Typography>
              <Tooltip title={gdTooltipContent} arrow placement="top" slotProps={tooltipSx}>
                <IconButton size="small" sx={{ p: 0.25 }}>
                  <Info size={14} color="#a1a1aa" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled">-</Typography>
          )}
        </TableCell>
      )}

      {/* Bonus Score - collapsed */}
      {showBonusScores && (
        <TableCell align="center" sx={cellSx}>
          {person.bonusScore ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <Chip
                label={person.bonusScore.attempt > 0 ? '\u2713' : '\u2717'}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 22,
                  minWidth: 22,
                  backgroundColor: person.bonusScore.attempt > 0 ? '#dcfce7' : '#f4f4f5',
                  color: person.bonusScore.attempt > 0 ? '#166534' : '#3f3f46',
                }}
              />
              <Typography variant="body2" fontWeight={500}>
                {bonusTotal}/10
              </Typography>
              <Tooltip title={bonusTooltipContent} arrow placement="top" slotProps={tooltipSx}>
                <IconButton size="small" sx={{ p: 0.25 }}>
                  <Info size={14} color="#a1a1aa" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled">-</Typography>
          )}
        </TableCell>
      )}

      {/* Exercise Score - collapsed */}
      {showExerciseScores && (
        <TableCell align="center" sx={cellSx}>
          {person.exerciseScore ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <Chip
                label={person.exerciseScore.Submitted && person.exerciseScore.privateTest ? '\u2713' : person.exerciseScore.Submitted ? 'Partial' : '\u2717'}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 22,
                  backgroundColor: person.exerciseScore.Submitted && person.exerciseScore.privateTest
                    ? '#dcfce7'
                    : person.exerciseScore.Submitted
                      ? '#fef9c3'
                      : '#f4f4f5',
                  color: person.exerciseScore.Submitted && person.exerciseScore.privateTest
                    ? '#166534'
                    : person.exerciseScore.Submitted
                      ? '#854d0e'
                      : '#3f3f46',
                }}
              />
              <Tooltip title={exerciseTooltipContent} arrow placement="top" slotProps={tooltipSx}>
                <IconButton size="small" sx={{ p: 0.25 }}>
                  <Info size={14} color="#a1a1aa" />
                </IconButton>
              </Tooltip>
              {person.exerciseScore.Submitted && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchStudentRepoLink(week, person.name);
                  }}
                  sx={{ p: 0.25 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a1a1aa"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </IconButton>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled">-</Typography>
          )}
        </TableCell>
      )}

      {/* Total Score */}
      <TableCell align="center" sx={cellSx}>
        <Typography variant="body2" fontWeight={600} color="text.primary">
          {person.total}
        </Typography>
      </TableCell>

      {/* Edit Button */}
      <TableCell align="center" sx={cellSx}>
        <Button
          variant="contained"
          size="small"
          onClick={handleEditClick}
          sx={{
            textTransform: 'none',
            backgroundColor: '#ea580c',
            '&:hover': { backgroundColor: '#c2410c' },
            fontWeight: 500,
            fontSize: '0.75rem',
            px: 2,
            py: 0.5,
            boxShadow: 'none',
            '&:active': { boxShadow: 'none' },
          }}
        >
          Edit
        </Button>
      </TableCell>
    </TableRow>
  );
};
