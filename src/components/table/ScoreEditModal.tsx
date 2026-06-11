import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { X } from 'lucide-react';
import type { TableRowData } from '../../types/student';
import type { GetTeachingAssistantResponseDto } from '../../types/api';
import { getGroupNumber } from '../../helpers/taHelpers';

interface ScoreEditModalProps {
  student: TableRowData;
  cohortId: string;
  weekId: string;
  week: number;
  weekType?: string;
  weekHasExercise?: boolean;
  cohortType?: string;
  teachingAssistants?: GetTeachingAssistantResponseDto[];
  onSubmit: (studentData: TableRowData, groupNumber: number, teachingAssistantId: string) => void;
  onClose: () => void;
}

const selectSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#18181b',
    color: '#fafafa',
    '& fieldset': { borderColor: '#3f3f46' },
    '&:hover fieldset': { borderColor: '#f97316' },
    '&.Mui-focused fieldset': { borderColor: '#f97316' },
    '&.Mui-disabled': {
      bgcolor: '#1c1c1e',
      '& fieldset': { borderColor: '#3f3f46' },
    },
    '&.Mui-disabled .MuiSelect-select': { WebkitTextFillColor: '#71717a' },
  },
  '& .MuiInputLabel-root': { color: '#a1a1aa' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
  '& .MuiInputLabel-root.Mui-disabled': { color: '#71717a' },
  '& .MuiSelect-icon': { color: '#a1a1aa' },
  '& .MuiSelect-icon.Mui-disabled': { color: '#52525b' },
};

const disabledCheckboxSx = {
  color: '#52525b',
  '&.Mui-checked': { color: '#f97316' },
  '&.Mui-disabled': { color: '#52525b' },
};

export const ScoreEditModal: React.FC<ScoreEditModalProps> = ({
  student,
  week,
  weekType,
  weekHasExercise,
  cohortType,
  teachingAssistants,
  onSubmit,
  onClose,
}) => {
  const [editedStudent, setEditedStudent] = useState<TableRowData>({
    ...student,
    gdScore: student.gdScore ?? { fa: 0, fb: 0, fc: 0, fd: 0 },
    bonusScore: student.bonusScore ?? { attempt: 0, good: 0, followUp: 0 },
    exerciseScore: student.exerciseScore ?? { Submitted: false, privateTest: false },
  });

  const [groupNumber, setGroupNumber] = useState<number>(getGroupNumber(student.group));
  const [selectedTAId, setSelectedTAId] = useState<string>('');

  const isGroupDiscussion = weekType === 'GROUP_DISCUSSION';
  const showExerciseScores = isGroupDiscussion && weekHasExercise === true;
  const isAttended = editedStudent.attendance;

  const scoreOptions = [0, 1, 2, 3, 4, 5];

  const gdLabels: Record<string, string> = {
    fa: 'Communication',
    fb: 'Depth of Answer',
    fc: 'Technical Fluency',
    fd: 'Engagement',
  };

  const bonusLabels: Record<string, string> = {
    good: 'Answer Quality',
    followUp: 'Follow Up',
  };

  const handleAttendanceChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setEditedStudent(prev => ({ ...prev, attendance: checked }));
  };

  const handleGdChange = (key: string, value: number) => {
    setEditedStudent(prev => ({
      ...prev,
      gdScore: { ...prev.gdScore, [key]: value },
    }));
  };

  const handleBonusAttemptChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setEditedStudent(prev => ({
      ...prev,
      bonusScore: { ...prev.bonusScore, attempt: checked ? 1 : 0 },
    }));
  };

  const handleBonusChange = (key: string, value: number) => {
    setEditedStudent(prev => ({
      ...prev,
      bonusScore: { ...prev.bonusScore, [key]: value },
    }));
  };

  const handleExerciseChange = (key: string, checked: boolean) => {
    setEditedStudent(prev => ({
      ...prev,
      exerciseScore: { ...prev.exerciseScore, [key]: checked },
    }));
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: { sx: { backdropFilter: 'blur(6px)', bgcolor: 'rgba(0,0,0,0.7)' } },
      }}
      PaperProps={{
        sx: {
          bgcolor: '#1c1c1e',
          backgroundImage: 'none',
          borderRadius: 3,
          border: '1px solid #3f3f46',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa' }}>
            Edit Scores — {editedStudent.name}
          </Typography>
          <Typography variant="body2" sx={{ color: '#a1a1aa', mt: 0.5 }}>
            {weekType === 'ORIENTATION' ? 'Orientation' : weekType === 'GRADUATION' ? 'Graduation' : `Week ${week}`} · {editedStudent.group || 'No Group'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#a1a1aa', '&:hover': { color: '#fafafa' } }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
        {/* Attendance */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={editedStudent.attendance}
                onChange={handleAttendanceChange}
                sx={{ color: '#52525b', '&.Mui-checked': { color: '#f97316' } }}
              />
            }
            label={<Typography sx={{ color: '#fafafa', fontWeight: 500 }}>Attended This Week</Typography>}
            sx={{ mr: 0 }}
          />
          <Typography
            variant="body2"
            sx={{ color: '#a1a1aa', visibility: isAttended ? 'hidden' : 'visible' }}
            aria-hidden={isAttended}
          >
            Mark attendance to enter scores.
          </Typography>
        </Box>

        {/* Group Assignment */}
        <Box>
          <Typography sx={{ color: '#d4d4d8', fontWeight: 600, mb: 2 }}>Group Assignment</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth sx={selectSx}>
              <InputLabel>Group Number</InputLabel>
              <Select
                value={groupNumber}
                label="Group Number"
                onChange={e => setGroupNumber(Number(e.target.value))}
                MenuProps={{ PaperProps: { sx: { bgcolor: '#18181b', border: '1px solid #27272a', color: '#fafafa' } } }}
              >
                {[0, 1, 2, 3, 4, 5].map(val => (
                  <MenuItem key={val} value={val} sx={{ '&:hover': { bgcolor: '#27272a' } }}>
                    Group {val}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={selectSx}>
              <InputLabel>Teaching Assistant</InputLabel>
              <Select
                value={selectedTAId}
                label="Teaching Assistant"
                onChange={e => setSelectedTAId(e.target.value as string)}
                MenuProps={{ PaperProps: { sx: { bgcolor: '#18181b', border: '1px solid #27272a', color: '#fafafa' } } }}
              >
                <MenuItem value="" sx={{ '&:hover': { bgcolor: '#27272a' } }}>
                  None
                </MenuItem>
                {teachingAssistants?.map(ta => (
                  <MenuItem key={ta.id} value={ta.id} sx={{ '&:hover': { bgcolor: '#27272a' } }}>
                    {ta.discordGlobalName || ta.discordUserName || ta.name || ta.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* GD Scores — only for GROUP_DISCUSSION weeks */}
        {isGroupDiscussion && (
          <Box>
            <Typography sx={{ color: isAttended ? '#d4d4d8' : '#71717a', fontWeight: 600, mb: 2 }}>Group Discussion Scores</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
              {(['fa', 'fb', 'fc', 'fd'] as const).map(key => (
                <FormControl key={key} fullWidth sx={selectSx} disabled={!isAttended}>
                  <InputLabel>{gdLabels[key]}</InputLabel>
                  <Select
                    value={editedStudent.gdScore[key]}
                    label={gdLabels[key]}
                    disabled={!isAttended}
                    onChange={e => handleGdChange(key, Number(e.target.value))}
                    MenuProps={{ PaperProps: { sx: { bgcolor: '#18181b', border: '1px solid #27272a', color: '#fafafa' } } }}
                  >
                    {scoreOptions.map(val => (
                      <MenuItem key={val} value={val} sx={{ '&:hover': { bgcolor: '#27272a' } }}>
                        {val === 0 ? '-' : val}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </Box>
          </Box>
        )}

        {/* Bonus Scores — only for GROUP_DISCUSSION weeks */}
        {isGroupDiscussion && (
          <Box>
            <Typography sx={{ color: isAttended ? '#d4d4d8' : '#71717a', fontWeight: 600, mb: 2 }}>Bonus Scores</Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editedStudent.bonusScore.attempt > 0}
                  onChange={handleBonusAttemptChange}
                  disabled={!isAttended}
                  sx={disabledCheckboxSx}
                />
              }
              label={<Typography sx={{ color: isAttended ? '#fafafa' : '#71717a', fontWeight: 500 }}>Bonus Attempted</Typography>}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {(['good', 'followUp'] as const).map(key => (
                <FormControl key={key} fullWidth sx={selectSx} disabled={!isAttended}>
                  <InputLabel>{bonusLabels[key]}</InputLabel>
                  <Select
                    value={editedStudent.bonusScore[key]}
                    label={bonusLabels[key]}
                    disabled={!isAttended}
                    onChange={e => handleBonusChange(key, Number(e.target.value))}
                    MenuProps={{ PaperProps: { sx: { bgcolor: '#18181b', border: '1px solid #27272a', color: '#fafafa' } } }}
                  >
                    {scoreOptions.map(val => (
                      <MenuItem key={val} value={val} sx={{ '&:hover': { bgcolor: '#27272a' } }}>
                        {val === 0 ? '-' : val}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </Box>
          </Box>
        )}

        {/* Exercise Scores — only for GROUP_DISCUSSION weeks with exercises */}
        {showExerciseScores && (
          <Box>
            <Typography sx={{ color: isAttended ? '#d4d4d8' : '#71717a', fontWeight: 600, mb: 2 }}>Exercise Scores</Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editedStudent.exerciseScore.Submitted}
                    onChange={(_, checked) => handleExerciseChange('Submitted', checked)}
                    disabled={!isAttended}
                    sx={disabledCheckboxSx}
                  />
                }
                label={<Typography sx={{ color: isAttended ? '#fafafa' : '#71717a', fontWeight: 500 }}>Submitted</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editedStudent.exerciseScore.privateTest}
                    onChange={(_, checked) => handleExerciseChange('privateTest', checked)}
                    disabled={!isAttended}
                    sx={disabledCheckboxSx}
                  />
                }
                label={<Typography sx={{ color: isAttended ? '#fafafa' : '#71717a', fontWeight: 500 }}>Tests Passing</Typography>}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: '#d4d4d8',
            borderColor: '#52525b',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit(editedStudent, groupNumber, selectedTAId)}
          variant="contained"
          sx={{
            bgcolor: '#f97316',
            '&:hover': { bgcolor: '#ea580c' },
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
          }}
        >
          Save Scores
        </Button>
      </DialogActions>
    </Dialog>
  );
};
