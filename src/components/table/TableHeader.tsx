import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Paper,
  Typography,
  Stack,
  InputAdornment,
  IconButton,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search,
  Download,
  X,
  Users,
  UserCheck,
  UserX,
  Shuffle,
  BookOpen,
  CalendarClock,
} from 'lucide-react';

interface Week {
  id: string;
  week: number;
  type: string;
  hasExercise: boolean;
  questions: { text: string; attachments: string[] }[];
  bonusQuestion: { text: string; attachments: string[] }[];
  classroomUrl: string;
  classroomInviteLink: string;
}

interface TableHeaderProps {
  week: number;
  selectedWeekId: string;
  weeks: Week[];
  onWeekChange: (week: number, weekId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  selectedTA: string;
  onTAChange: (ta: string) => void;
  attendanceFilter: 'All' | 'Present' | 'Absent';
  onAttendanceFilterChange: (filter: 'All' | 'Present' | 'Absent') => void;
  baseGroups: string[];
  taOptions: string[];
  totalCount: number | null;
  weeklyData: { week: number; attended: number };
  onAddNew: () => void;
  onDownloadCSV: () => void;
  onAssignGroups: () => void;
  onTASelfAssign?: () => void;
  onClearFilters: () => void;
  navigate: (path: string) => void;
  cohortType?: string;
  cohortId?: string;
  isTA?: boolean;
  onScheduleDate?: () => void;
}

const selectSx = {
  bgcolor: '#27272a',
  color: '#d4d4d8',
  borderRadius: 1,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3f3f46' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#f97316' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f97316' },
  '& .MuiSvgIcon-root': { color: '#a1a1aa' },
  '& .MuiSelect-select': { py: 1.25, fontSize: '0.875rem' },
};

export const TableHeader: React.FC<TableHeaderProps> = ({
  week,
  selectedWeekId,
  weeks,
  onWeekChange,
  searchTerm,
  onSearchChange,
  selectedGroup,
  onGroupChange,
  selectedTA,
  onTAChange,
  attendanceFilter,
  onAttendanceFilterChange,
  baseGroups,
  taOptions,
  totalCount,
  weeklyData,
  onAssignGroups,
  onTASelfAssign,
  onDownloadCSV,
  onClearFilters,
  navigate,
  cohortType,
  cohortId,
  isTA,
  onScheduleDate,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const absentees = totalCount != null && weeklyData.attended != null
    ? totalCount - weeklyData.attended
    : null;

  const showInstructions = cohortType === 'MASTERING_BITCOIN'
    || cohortType === 'LEARNING_BITCOIN_FROM_COMMAND_LINE'
    || cohortType === 'MASTERING_LIGHTNING_NETWORK'
    || cohortType === 'BITCOIN_PROTOCOL_DEVELOPMENT';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 3 }}>
      {/* Week Selection */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        {weeks.map(weekData => (
          <Chip
            key={weekData.id}
            label={weekData.type === 'ORIENTATION' ? 'Orientation' : weekData.type === 'GRADUATION' ? 'Graduation' : `Week ${weekData.week}`}
            onClick={() => onWeekChange(weekData.week, weekData.id)}
            sx={{
              fontWeight: 500,
              fontSize: '0.875rem',
              px: 1,
              height: 36,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              ...(selectedWeekId === weekData.id
                ? {
                    bgcolor: '#ea580c',
                    color: '#fff',
                    '&:hover': { bgcolor: '#c2410c' },
                  }
                : {
                    bgcolor: '#fb923c',
                    color: '#fff',
                    '&:hover': { bgcolor: '#f97316' },
                  }),
            }}
          />
        ))}
      </Box>

      {/* Filters Row */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#000',
          border: '1px solid #27272a',
          borderRadius: 2,
          p: { xs: 1.5, sm: 2 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1.5,
            alignItems: { xs: 'stretch', md: 'center' },
            flexWrap: 'wrap',
          }}
        >
          {/* Search */}
          <TextField
            size="small"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color="#a1a1aa" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => onSearchChange('')} sx={{ p: 0.25 }}>
                      <X size={14} color="#a1a1aa" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              minWidth: { xs: '100%', sm: 200 },
              flexGrow: { xs: 1, md: 0 },
              '& .MuiOutlinedInput-root': {
                bgcolor: '#27272a',
                color: '#d4d4d8',
                borderRadius: 1,
                fontSize: '0.875rem',
                '& fieldset': { borderColor: '#3f3f46' },
                '&:hover fieldset': { borderColor: '#f97316' },
                '&.Mui-focused fieldset': { borderColor: '#f97316' },
              },
              '& .MuiInputBase-input::placeholder': { color: '#71717a', opacity: 1 },
            }}
          />

          {/* Group Filter */}
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
            <Select
              value={selectedGroup}
              onChange={e => onGroupChange(e.target.value)}
              sx={selectSx}
              MenuProps={{ PaperProps: { sx: { bgcolor: '#27272a', color: '#d4d4d8' } } }}
            >
              {['All Groups', ...baseGroups].map(g => (
                <MenuItem key={g} value={g} sx={{ fontSize: '0.875rem', '&:hover': { bgcolor: '#3f3f46' } }}>
                  {g}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* TA Filter */}
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
            <Select
              value={selectedTA}
              onChange={e => onTAChange(e.target.value)}
              sx={selectSx}
              MenuProps={{ PaperProps: { sx: { bgcolor: '#27272a', color: '#d4d4d8' } } }}
            >
              {taOptions.map(ta => (
                <MenuItem key={ta} value={ta} sx={{ fontSize: '0.875rem', '&:hover': { bgcolor: '#3f3f46' } }}>
                  {ta}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Attendance Filter */}
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
            <Select
              value={attendanceFilter}
              onChange={e => onAttendanceFilterChange(e.target.value as 'All' | 'Present' | 'Absent')}
              sx={selectSx}
              MenuProps={{ PaperProps: { sx: { bgcolor: '#27272a', color: '#d4d4d8' } } }}
            >
              <MenuItem value="All" sx={{ fontSize: '0.875rem', '&:hover': { bgcolor: '#3f3f46' } }}>All Attendance</MenuItem>
              <MenuItem value="Present" sx={{ fontSize: '0.875rem', '&:hover': { bgcolor: '#3f3f46' } }}>Present</MenuItem>
              <MenuItem value="Absent" sx={{ fontSize: '0.875rem', '&:hover': { bgcolor: '#3f3f46' } }}>Absent</MenuItem>
            </Select>
          </FormControl>

          {/* Clear Filters */}
          <Button
            variant="outlined"
            size="small"
            onClick={onClearFilters}
            startIcon={<X size={14} />}
            sx={{
              color: '#a1a1aa',
              borderColor: '#3f3f46',
              textTransform: 'none',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
            }}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Stats + Actions Row */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
        }}
      >
        {/* Stats Cards */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            flexGrow: 1,
          }}
        >
          {/* Total Participants */}
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 1.5,
              bgcolor: '#000',
              border: '1px solid #27272a',
              borderRadius: 2,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: 'rgba(249,115,22,0.15)',
                flexShrink: 0,
              }}
            >
              <Users size={18} color="#f97316" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#71717a', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Participants
              </Typography>
              <Typography variant="h6" sx={{ color: '#fafafa', fontWeight: 600, lineHeight: 1.2, fontSize: '1.25rem' }}>
                {totalCount ?? '...'}
              </Typography>
            </Box>
          </Paper>

          {/* Attendees */}
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 1.5,
              bgcolor: '#000',
              border: '1px solid #27272a',
              borderRadius: 2,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: 'rgba(34,197,94,0.15)',
                flexShrink: 0,
              }}
            >
              <UserCheck size={18} color="#22c55e" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#71717a', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Attendees
              </Typography>
              <Typography variant="h6" sx={{ color: '#22c55e', fontWeight: 600, lineHeight: 1.2, fontSize: '1.25rem' }}>
                {weeklyData.attended ?? 0}
              </Typography>
            </Box>
          </Paper>

          {/* Absentees */}
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 1.5,
              bgcolor: '#000',
              border: '1px solid #27272a',
              borderRadius: 2,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: 'rgba(239,68,68,0.15)',
                flexShrink: 0,
              }}
            >
              <UserX size={18} color="#ef4444" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#71717a', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Absentees
              </Typography>
              <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 600, lineHeight: 1.2, fontSize: '1.25rem' }}>
                {absentees ?? '...'}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Action Buttons */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ flexShrink: 0 }}
        >
          {showInstructions && (
            <Button
              variant="contained"
              size="small"
              startIcon={<BookOpen size={15} />}
              onClick={() => {
                if (cohortId) {
                  navigate(`/${cohortId}/instructions`);
                }
              }}
              sx={{
                bgcolor: '#fb923c',
                '&:hover': { bgcolor: '#f97316' },
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8rem',
                boxShadow: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Instructions
            </Button>
          )}

          {week > 0 && (
            <Button
              variant="contained"
              size="small"
              startIcon={<Shuffle size={15} />}
              onClick={onAssignGroups}
              sx={{
                bgcolor: '#fb923c',
                '&:hover': { bgcolor: '#f97316' },
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8rem',
                boxShadow: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Assign Groups
            </Button>
          )}

          {isTA && onScheduleDate && (
            <Button
              variant="outlined"
              size="small"
              disabled
              startIcon={<CalendarClock size={15} />}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8rem',
                boxShadow: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Schedule Date
            </Button>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<Download size={15} />}
            onClick={onDownloadCSV}
            sx={{
              color: '#d4d4d8',
              borderColor: '#3f3f46',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.8rem',
              boxShadow: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
            }}
          >
            CSV
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};
