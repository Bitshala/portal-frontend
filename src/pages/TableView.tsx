/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button as MuiButton,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import { Eye, X } from 'lucide-react';

import { TableHeader } from '../components/table/TableHeader';
import { StudentTableGrid } from '../components/table/StudentTableGrid';
import { ScoreEditModal } from '../components/table/ScoreEditModal';
import { TableContextMenu } from '../components/table/TableContextMenu';

import { computeTotal, cohortHasExercises } from '../utils/calculations';
import { downloadCSV } from '../utils/csvUtils';
import type { TableRowData } from '../types/student';
import type { UpdateScoresRequestDto } from '../types/api';

import {
  useScoresForCohortAndWeek,
  useUpdateScoresForUserCohortAndWeek,
  useAssignGroupsForCohortWeek,
} from '../hooks/scoreHooks';
import { useTeachingAssistants } from '../hooks/teachingAssistantHooks';
import apiService from '../services/apiService';
import { useCohort, useRemoveUserFromCohort } from '../hooks/cohortHooks';
import { useUser } from '../hooks/userHooks';
import { UserRole } from '../types/enums';
import { cohortTypeToName, formatCohortDate } from '../helpers/cohortHelpers.ts';
import { generateMockTableData, mockWeeks } from '../data/mockTableData';


const TableView: React.FC = () => {
  const navigate = useNavigate();
  const { cohortId: cohortIdParam, weekId: weekIdParam } = useParams<{ cohortId: string; weekId: string }>();

  // === User data ===
  const { data: userData } = useUser();
  const isTA = userData?.role === UserRole.TEACHING_ASSISTANT || userData?.role === UserRole.ADMIN;

  // === Cohort & Weeks (dynamic from hook) ===
  const {
    data: cohortData,
    isLoading: isCohortLoading,
    error: cohortError,
  } = useCohort(cohortIdParam);

  const weeks = useMemo(() => {
    const apiWeeks = cohortData?.weeks ?? [];
    return apiWeeks.length > 0 ? apiWeeks : mockWeeks;
  }, [cohortData]);


  // Derive selectedWeekId from URL param
  const selectedWeekId = weekIdParam === 'default' ? null : weekIdParam;

  // Redirect from 'default' or invalid weekId to the first week
  useEffect(() => {
    if (weeks.length > 0) {
      if (weekIdParam === 'default' || !weeks.find(w => w.id === weekIdParam)) {
        navigate(`/cohort/${cohortIdParam}/week/${weeks[0].id}`, { replace: true });
      }
    }
  }, [weeks, weekIdParam, cohortIdParam, navigate]);

  // Derived week metadata
  const selectedWeekData = useMemo(
    () => weeks.find(w => w.id === selectedWeekId),
    [weeks, selectedWeekId]
  );
  const weekIndex = selectedWeekData?.week ?? 0;
  const selectedWeekType = selectedWeekData?.type;
  const selectedWeekHasExercise = selectedWeekData?.hasExercise ?? false;

  // === Scores for selected week ===
  const {
    data: scoresData,
    error: scoresError,
    isLoading: isScoresLoading,
    isPending: isScoresPending,
  } = useScoresForCohortAndWeek({
    cohortId: cohortIdParam,
    weekId: selectedWeekId,
  }, { enabled: !!selectedWeekId });

  // === Local table state ===
  const [data, setData] = useState<TableRowData[]>([]);

  const baseGroups = useMemo(() => {
    if (!data || data.length === 0) return [];
    const unique = new Set(data.map((p) => p.group).filter(Boolean));
    return Array.from(unique).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? '0');
      const numB = parseInt(b.match(/\d+/)?.[0] ?? '0');
      return numA - numB;
    });
  }, [data]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All Groups');
  const [selectedTA, setSelectedTA] = useState<string>('All TAs');
  const [attendanceFilter, setAttendanceFilter] = useState<'All' | 'Present' | 'Absent'>('All');

  const [showScoreEditModal, setShowScoreEditModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<TableRowData | null>(null);

  // Unified assign groups + TA modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStep, setAssignStep] = useState<'config' | 'loading' | 'assign-ta' | 'assigning-ta'>('config');
  const [participantsPerGroup, setParticipantsPerGroup] = useState<number>(8);
  const [groupsAvailable, setGroupsAvailable] = useState<number>(3);
  const [taAssignments, setTaAssignments] = useState<Record<number, string>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });


  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetId: number | null;
  }>({ visible: false, x: 0, y: 0, targetId: null });

  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ week: number; attended: number }>({
    week: 0,
    attended: 0,
  });

  // === Mutation ===
  const updateScoresMutation = useUpdateScoresForUserCohortAndWeek();
  const assignGroupsMutation = useAssignGroupsForCohortWeek();
  const { data: teachingAssistants } = useTeachingAssistants();
  const removeUserMutation = useRemoveUserFromCohort();

  // === Transform API scores to table rows ===
  useEffect(() => {
    if (!scoresData?.scores || !Array.isArray(scoresData.scores) || scoresData.scores.length === 0) {
      if (scoresError) {
        console.error('Error fetching weekly data:', scoresError);
      }
      // Fallback to mock data when no API data
      const mock = generateMockTableData(weekIndex, 16);
      setData(mock);
      setTotalCount(mock.length);
      return;
    }

    const transformed: TableRowData[] = scoresData.scores.map((score: any, idx: number) => {
      const gd = score.groupDiscussionScores;
      const ex = score.exerciseScores;
      const groupNumber = gd?.groupNumber ?? 0;

      // TA is at the top level of the score object
      const teachingAssistant = score.teachingAssistant ?? gd?.teachingAssistant;
      const taName = teachingAssistant
        ? (teachingAssistant.discordGlobalName || teachingAssistant.discordUsername || teachingAssistant.name || 'N/A')
        : 'N/A';

      // API returns `attended` (boolean) at the top level
      const isPresent = Boolean(score.attended ?? gd?.attendance);

      return {
        id: typeof score.userId === 'number' ? score.userId : idx,
        userId: score.userId, // maintain for API calls
        name: score.name ?? score.discordGlobalName ?? score.discordUsername ?? 'Unknown',
        discordGlobalName: score.discordGlobalName ?? score.discordUsername ?? score.name ?? 'Unknown',
        email: score.discordUsername ?? '', // discord username
        group: `Group ${groupNumber}`,
        ta: taName,
        attendance: isPresent,
        gdScore: gd ? {
          fa: gd.communicationScore ?? 0,
          fb: gd.depthOfAnswerScore ?? 0,
          fc: gd.technicalBitcoinFluencyScore ?? 0,
          fd: gd.engagementScore ?? 0,
        } : null,
        bonusScore: gd ? {
          attempt: gd.isBonusAttempted ? 1 : 0,
          good: gd.bonusAnswerScore ?? 0,
          followUp: gd.bonusFollowupScore ?? 0,
        } : null,
        exerciseScore: ex ? {
          Submitted: Boolean(ex.isSubmitted),
          privateTest: Boolean(ex.isPassing),
        } : null,
        week: weekIndex,
        total: score.totalScore ?? 0,
      };
    });

    setData(transformed);
    setTotalCount(scoresData.scores.length);
  }, [scoresData, scoresError, weekIndex]);

  // Recalculate attended count whenever local data changes (after edits too)
  useEffect(() => {
    if (data.length > 0) {
      setWeeklyData({ week: weekIndex, attended: data.filter(s => s.attendance).length });
    }
  }, [data, weekIndex]);

  // === Derived options ===
  const taOptions = useMemo(() => {
    if (!data || data.length === 0) return ['All TAs'];
    const unique = new Set(data.map((p) => p.ta).filter((ta) => ta && ta !== 'N/A'));
    return ['All TAs', ...Array.from(unique).sort()];
  }, [data]);

  // === Sorting ===
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TableRowData | null;
    direction: 'ascending' | 'descending';
  }>({ key: null, direction: 'ascending' });

  const sortedFilteredData = useMemo(() => {
    let rows = [...data];

    if (selectedGroup !== 'All Groups') rows = rows.filter((p) => p.group === selectedGroup);
    if (selectedTA !== 'All TAs') rows = rows.filter((p) => p.ta === selectedTA);
    if (attendanceFilter === 'Present') rows = rows.filter((p) => p.attendance);
    if (attendanceFilter === 'Absent') rows = rows.filter((p) => !p.attendance);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter((p) =>
        p.name.toLowerCase().includes(term) ||
        p.discordGlobalName?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term)
      );
    }

    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      const dir = direction === 'ascending' ? 1 : -1;

      rows.sort((a, b) => {
        const av = a[key!];
        const bv = b[key!];

        // string
        if (typeof av === 'string' && typeof bv === 'string') {
          return av.localeCompare(bv) * dir;
        }
        // number
        if (typeof av === 'number' && typeof bv === 'number') {
          return (av - bv) * dir;
        }
        // boolean
        if (typeof av === 'boolean' && typeof bv === 'boolean') {
          // true before false when ascending
          if (av === bv) return 0;
          return (av ? -1 : 1) * dir;
        }
        // fallback: keep stable
        return 0;
      });
    }

    return rows;
  }, [data, selectedGroup, selectedTA, attendanceFilter, searchTerm, sortConfig]);

  // === Handlers ===
  const handleWeekChange = useCallback(
    (_newIndex: number, weekId: string) => {
      navigate(`/cohort/${cohortIdParam}/week/${weekId}`);
      setContextMenu({ visible: false, x: 0, y: 0, targetId: null });
    },
    [navigate, cohortIdParam]
  );

  const handleStudentClick = useCallback((student: TableRowData) => {
    const studentId = student.userId ?? student.id;
    const cohortType = cohortData?.type;
    const cohortId = cohortData?.id;
    const studentName = encodeURIComponent(student.name);
    navigate(`/detailPage?studentId=${studentId}&cohortType=${cohortType}&cohortId=${cohortId}&studentName=${studentName}&from=table`);
  }, [navigate, cohortData?.type, cohortData?.id]);

  const handleEditStudent = useCallback((student: TableRowData) => {
    setSelectedStudentForEdit(student);
    setShowScoreEditModal(true);
  }, []);

  const handleScoreUpdate = useCallback(
    (updated: TableRowData, groupNumber?: number, teachingAssistantId?: string) => {
      if (!selectedStudentForEdit || !cohortData?.id || !selectedWeekId) return;

      const body: UpdateScoresRequestDto = {
        attendance: updated.attendance,
        communicationScore: updated.gdScore?.fa ?? 0,
        depthOfAnswerScore: updated.gdScore?.fb ?? 0,
        technicalBitcoinFluencyScore: updated.gdScore?.fc ?? 0,
        engagementScore: updated.gdScore?.fd ?? 0,
        isBonusAttempted: (updated.bonusScore?.attempt ?? 0) > 0,
        bonusAnswerScore: updated.bonusScore?.good ?? 0,
        bonusFollowupScore: updated.bonusScore?.followUp ?? 0,
        isSubmitted: updated.exerciseScore?.Submitted ?? false,
        isPassing: updated.exerciseScore?.privateTest ?? false,
        groupNumber,
        teachingAssistantId: teachingAssistantId || undefined,
      };

      const userId = (selectedStudentForEdit as any).userId ?? String(selectedStudentForEdit.id);

      updateScoresMutation.mutate(
        {
          userId,
          cohortId: cohortData.id,
          weekId: selectedWeekId,
          body,
        },
        {
          onSuccess: () => {
            const taMatch = teachingAssistants?.find(ta => ta.id === teachingAssistantId);
            const updatedGroup = groupNumber !== undefined ? `Group ${groupNumber}` : updated.group;
            const updatedTA = taMatch
              ? (taMatch.discordGlobalName || taMatch.discordUserName || taMatch.name || 'N/A')
              : updated.ta;

            setData((prev) =>
              prev.map((p) =>
                p.id === updated.id ? {
                  ...updated, group: updatedGroup, ta: updatedTA, total: computeTotal({
                    attendance: updated.attendance,
                    gdScore: updated.gdScore ?? { fa: 0, fb: 0, fc: 0, fd: 0 },
                    bonusScore: updated.bonusScore ?? { attempt: 0, good: 0, followUp: 0 },
                    exerciseScore: updated.exerciseScore ?? { Submitted: false, privateTest: false },
                  }, cohortHasExercises(cohortData?.type || ''))
                } : p
              )
            );
            setShowScoreEditModal(false);
            setSelectedStudentForEdit(null);
          },
          onError: (error: unknown) => {
            console.error('Score update failed', error);
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            alert(`Failed to update scores: ${message}`);
          },
        }
      );
    },
    [selectedStudentForEdit, cohortData?.id, selectedWeekId, updateScoresMutation, teachingAssistants]
  );

  const handleDeleteStudent = useCallback((studentId: string) => {
    if (!cohortData?.id) {
      console.error('No cohort ID available');
      return;
    }

    removeUserMutation.mutate(
      {
        cohortId: cohortData.id,
        userId: studentId,
      },
      {
        onSuccess: () => {
          console.log('Successfully deleted student');
          // Remove student from local state
          setData((prev) => prev.filter((s) => {
            const id = s.userId ?? s.id;
            return String(id) !== String(studentId);
          }));
          alert('Student removed successfully!');
        },
        onError: (error: any) => {
          console.error('Failed to remove student - Full error:', error);
          console.error('Error response:', error?.response?.data);
          console.error('Error status:', error?.response?.status);
          const message = error?.response?.data?.message || error?.message || 'Unknown error occurred';
          alert(`Failed to remove student: ${message}`);
        },
      }
    );
  }, [cohortData?.id, removeUserMutation]);

  const handleDownloadCSV = useCallback(() => {
    const rows = sortedFilteredData;
    if (rows.length === 0) return;

    const hasExercises = cohortHasExercises(cohortData?.type || '');

    const headers = [
      '#', 'Email', 'Name', 'Discord Name', 'Group', 'TA', 'Attendance',
      'Communication', 'Depth of Answer', 'Technical Bitcoin Fluency', 'Engagement',
      'Bonus Attempt', 'Bonus Good', 'Bonus Follow Up',
      ...(hasExercises ? ['Exercise Submitted', 'Exercise Passing'] : []),
      'Total',
    ];

    const csvRows = rows.map((r, i) => [
      i + 1, r.email, r.name, r.discordGlobalName, r.group, r.ta, r.attendance ? 'Present' : 'Absent',
      r.gdScore?.fa ?? '-', r.gdScore?.fb ?? '-', r.gdScore?.fc ?? '-', r.gdScore?.fd ?? '-',
      r.bonusScore?.attempt ?? '-', r.bonusScore?.good ?? '-', r.bonusScore?.followUp ?? '-',
      ...(hasExercises ? [r.exerciseScore?.Submitted ? 'Yes' : 'No', r.exerciseScore?.privateTest ? 'Yes' : 'No'] : []),
      r.total,
    ]);

    const weekLabel = weekIndex !== undefined ? `week${weekIndex}` : 'all';
    downloadCSV(headers, csvRows, `students-${weekLabel}.csv`);
  }, [sortedFilteredData, cohortData?.type, weekIndex]);

  const handleOpenAssignModal = useCallback(() => {
    // Always start from the config step so the user can (re-)assign groups
    setAssignStep('config');
    setTaAssignments({});
    setShowAssignModal(true);
  }, []);

  const handleAssignGroupsSubmit = useCallback(() => {
    if (isNaN(participantsPerGroup) || isNaN(groupsAvailable) || participantsPerGroup <= 0 || groupsAvailable <= 0) {
      setSnackbar({ open: true, message: 'Please enter valid positive numbers', severity: 'error' });
      return;
    }

    setAssignStep('loading');

    assignGroupsMutation.mutate(
      { weekId: selectedWeekId, cohortId: cohortIdParam, participantsPerWeek: participantsPerGroup, groupsAvailable },
      {
        onSuccess: async () => {
          setSnackbar({ open: true, message: 'Groups assigned successfully!', severity: 'success' });

          // Refetch scores to get actual group distribution from backend
          try {
            const freshScores = await apiService.listScoresForCohortAndWeek(cohortIdParam, selectedWeekId);
            const actualGroups = new Set<number>();
            if (freshScores?.scores) {
              freshScores.scores.forEach((score: any) => {
                const groupNum = score.groupDiscussionScores?.groupNumber ?? 0;
                if (groupNum > 0) actualGroups.add(groupNum);
              });
            }

            if (actualGroups.size === 0) {
              // All students are in Group 0 (e.g. all absent) — no real groups formed
              setSnackbar({ open: true, message: 'All students belong to Group 0. No groups were formed to assign TAs.', severity: 'info' });
              setShowAssignModal(false);
              setAssignStep('config');
            } else {
              // Initialize TA assignments only for groups that actually exist
              const initial: Record<number, string> = {};
              Array.from(actualGroups).sort((a, b) => a - b).forEach((g) => { initial[g] = ''; });
              setTaAssignments(initial);
              setAssignStep('assign-ta');
            }
          } catch {
            // Fallback: use configured groups if refetch fails
            const initial: Record<number, string> = {};
            for (let i = 1; i <= groupsAvailable; i++) {
              initial[i] = '';
            }
            setTaAssignments(initial);
            setAssignStep('assign-ta');
          }
        },
        onError: (error: unknown) => {
          console.error('Group assignment failed', error);
          const message = error instanceof Error ? error.message : 'Unknown error occurred';
          setSnackbar({ open: true, message: `Failed to assign groups: ${message}`, severity: 'error' });
          setAssignStep('config');
        },
      }
    );
  }, [selectedWeekId, cohortIdParam, participantsPerGroup, groupsAvailable, assignGroupsMutation]);

  const handleBatchTAAssign = useCallback(async () => {
    if (!selectedWeekId || !cohortIdParam) return;

    const assignments = Object.entries(taAssignments).filter(([, taId]) => taId !== '');
    if (assignments.length === 0) {
      setShowAssignModal(false);
      return;
    }

    setAssignStep('assigning-ta');

    try {
      await Promise.all(
        assignments.map(([groupNum, userId]) =>
          apiService.assignTAToGroup(selectedWeekId, parseInt(groupNum), userId)
        )
      );
      setSnackbar({ open: true, message: 'TAs assigned to groups successfully!', severity: 'success' });
      setShowAssignModal(false);
      // Invalidate scores to refresh the table
      if (cohortIdParam && selectedWeekId) {
        await useScoresForCohortAndWeek.invalidate({ cohortId: cohortIdParam, weekId: selectedWeekId });
      }
    } catch (error: any) {
      console.error('TA batch assignment failed', error);
      const message = error?.response?.data?.message || error?.message || 'Unknown error occurred';
      setSnackbar({ open: true, message: `Failed to assign TAs: ${message}`, severity: 'error' });
      setAssignStep('assign-ta');
    }
  }, [selectedWeekId, cohortIdParam, taAssignments]);

  // === Loading & error states ===
  if (isCohortLoading && !cohortError) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#000' }}>
        <CircularProgress sx={{ color: '#f97316' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, lg: 4 }, bgcolor: '#000', color: '#d4d4d8', minHeight: '100vh' }}>
      <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
        {/* Page Title */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            {cohortData && (
              <>
                <Typography
                  variant="h5"
                  sx={{ color: '#fafafa', fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  {cohortTypeToName(cohortData.type)} &ndash; Season {cohortData.season}
                </Typography>
                <Typography variant="body2" sx={{ color: '#71717a', mt: 0.5 }}>
                  {formatCohortDate(cohortData.startDate)} to {formatCohortDate(cohortData.endDate)}
                </Typography>
              </>
            )}
          </Box>
          <MuiButton
            variant="contained"
            startIcon={<Eye size={16} />}
            onClick={() => navigate(`/results/${cohortIdParam}`)}
            sx={{
              bgcolor: '#ea580c',
              '&:hover': { bgcolor: '#c2410c' },
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            View Result
          </MuiButton>
        </Box>

        <TableHeader
          // week props
          week={weekIndex}
          selectedWeekId={selectedWeekId}
          weeks={weeks}
          onWeekChange={handleWeekChange}

          // filters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          selectedTA={selectedTA}
          onTAChange={setSelectedTA}
          attendanceFilter={attendanceFilter}
          onAttendanceFilterChange={setAttendanceFilter}

          // meta
          baseGroups={baseGroups}
          taOptions={taOptions}
          totalCount={totalCount}
          weeklyData={weeklyData}
          onAddNew={() => {
            /* Implement when backend supports create */
          }}
          onDownloadCSV={handleDownloadCSV}
          onAssignGroups={handleOpenAssignModal}
          onTASelfAssign={undefined}
          onClearFilters={() => {
            setSearchTerm('');
            setSelectedGroup('All Groups');
            setSelectedTA('All TAs');
            setAttendanceFilter('All');
          }}
          navigate={navigate}
          cohortType={cohortData?.type}
          cohortId={cohortIdParam}
          isTA={isTA}
        />

        <StudentTableGrid
          data={sortedFilteredData}
          week={weekIndex}
          weekType={selectedWeekType}
          weekHasExercise={selectedWeekHasExercise}
          cohortType={cohortData?.type}
          sortConfig={sortConfig}
          onSort={setSortConfig}
          onStudentClick={handleStudentClick}
          onEditStudent={handleEditStudent}
          onContextMenu={setContextMenu}
        />

        {showScoreEditModal && selectedStudentForEdit && (
          <ScoreEditModal
            student={selectedStudentForEdit}
            cohortId={cohortData?.id}
            weekId={selectedWeekId}
            week={weekIndex}
            weekType={selectedWeekType}
            weekHasExercise={selectedWeekHasExercise}
            cohortType={cohortData?.type}
            teachingAssistants={teachingAssistants}
            onSubmit={handleScoreUpdate}
            onClose={() => {
              setShowScoreEditModal(false);
              setSelectedStudentForEdit(null);
            }}
          />
        )}

        {/* Unified Assign Groups + TA Modal */}
        <Dialog
          open={showAssignModal}
          onClose={() => { if (assignStep !== 'loading' && assignStep !== 'assigning-ta') setShowAssignModal(false); }}
          maxWidth="sm"
          fullWidth
          slotProps={{
            backdrop: { sx: { backdropFilter: 'blur(8px)', bgcolor: 'rgba(0,0,0,0.75)' } },
          }}
          PaperProps={{
            sx: {
              bgcolor: '#111113',
              backgroundImage: 'none',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            },
          }}
        >
          {/* Step 1: Configure groups */}
          {assignStep === 'config' && (
            <>
              <Box sx={{ px: 3.5, pt: 3.5, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1.35rem', letterSpacing: '-0.01em' }}>
                    Assign Groups
                  </Typography>
                  <Typography sx={{ color: '#71717a', fontSize: '0.85rem', mt: 0.5 }}>
                    Distribute students into groups for this week.
                  </Typography>
                </Box>
                <IconButton onClick={() => setShowAssignModal(false)} size="small" sx={{ color: '#52525b', mt: -0.5, '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.06)' } }}>
                  <X size={18} />
                </IconButton>
              </Box>
              <DialogContent sx={{ px: 3.5, pt: 2.5, pb: 1 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Per Group"
                    type="number"
                    value={participantsPerGroup}
                    onChange={(e) => setParticipantsPerGroup(parseInt(e.target.value) || 0)}
                    slotProps={{ htmlInput: { min: 1 } }}
                    required
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.04)', color: '#fafafa', borderRadius: 2,
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        '&:hover fieldset': { borderColor: 'rgba(249,115,22,0.5)' },
                        '&.Mui-focused fieldset': { borderColor: '#f97316' },
                      },
                      '& .MuiInputLabel-root': { color: '#71717a', fontSize: '0.85rem' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
                    }}
                  />
                  <TextField
                    label="Groups"
                    type="number"
                    value={groupsAvailable}
                    onChange={(e) => setGroupsAvailable(parseInt(e.target.value) || 0)}
                    slotProps={{ htmlInput: { min: 1 } }}
                    required
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.04)', color: '#fafafa', borderRadius: 2,
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        '&:hover fieldset': { borderColor: 'rgba(249,115,22,0.5)' },
                        '&.Mui-focused fieldset': { borderColor: '#f97316' },
                      },
                      '& .MuiInputLabel-root': { color: '#71717a', fontSize: '0.85rem' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
                    }}
                  />
                </Box>
              </DialogContent>
              <DialogActions sx={{ px: 3.5, pb: 3, pt: 2, gap: 1 }}>
                <MuiButton
                  onClick={() => setShowAssignModal(false)}
                  sx={{ color: '#71717a', textTransform: 'none', fontWeight: 500, fontSize: '0.85rem', '&:hover': { color: '#d4d4d8', bgcolor: 'rgba(255,255,255,0.04)' } }}
                >
                  Cancel
                </MuiButton>
                <MuiButton
                  onClick={handleAssignGroupsSubmit}
                  variant="contained"
                  sx={{
                    bgcolor: '#f97316', '&:hover': { bgcolor: '#ea580c' },
                    textTransform: 'none', fontWeight: 600, fontSize: '0.85rem',
                    boxShadow: 'none', borderRadius: 2, px: 3,
                  }}
                >
                  Assign Groups
                </MuiButton>
              </DialogActions>
            </>
          )}

          {/* Loading state */}
          {assignStep === 'loading' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
              <CircularProgress size={32} sx={{ color: '#f97316' }} />
              <Typography sx={{ color: '#71717a', fontSize: '0.9rem' }}>Assigning groups...</Typography>
            </Box>
          )}

          {/* Step 2: Assign TAs to groups */}
          {assignStep === 'assign-ta' && (
            <>
              <Box sx={{ px: 3.5, pt: 3.5, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1.35rem', letterSpacing: '-0.01em' }}>
                    Assign TAs
                  </Typography>
                  <Typography sx={{ color: '#71717a', fontSize: '0.85rem', mt: 0.5 }}>
                    {Object.keys(taAssignments).length} groups found. Select a TA for each group.
                  </Typography>
                </Box>
                <IconButton onClick={() => setShowAssignModal(false)} size="small" sx={{ color: '#52525b', mt: -0.5, '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.06)' } }}>
                  <X size={18} />
                </IconButton>
              </Box>
              <DialogContent sx={{ px: 3.5, pt: 1.5, pb: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {Object.keys(taAssignments).map((groupNum) => (
                    <Box
                      key={groupNum}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        p: 1.5, borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'border-color 0.15s',
                        '&:hover': { borderColor: 'rgba(255,255,255,0.1)' },
                      }}
                    >
                      <Typography sx={{
                        color: '#f97316', fontWeight: 700, fontSize: '0.8rem',
                        minWidth: 70, textAlign: 'center',
                        bgcolor: 'rgba(249,115,22,0.1)', borderRadius: 1.5, py: 0.75, px: 1.5,
                        letterSpacing: '0.02em',
                      }}>
                        Group {groupNum}
                      </Typography>
                      <Select
                        value={taAssignments[parseInt(groupNum)] || ''}
                        onChange={(e) => setTaAssignments((prev) => ({ ...prev, [parseInt(groupNum)]: e.target.value }))}
                        displayEmpty
                        size="small"
                        fullWidth
                        sx={{
                          bgcolor: 'transparent', color: '#fafafa', borderRadius: 1.5,
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.08)' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(249,115,22,0.4)' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f97316' },
                          '& .MuiSvgIcon-root': { color: '#52525b' },
                          '& .MuiSelect-select': { py: 1, fontSize: '0.875rem' },
                        }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: '#1c1c1e', color: '#d4d4d8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, mt: 0.5 } } }}
                      >
                        <MenuItem value="" sx={{ color: '#52525b', fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                          Select TA...
                        </MenuItem>
                        {teachingAssistants?.map((ta) => (
                          <MenuItem key={ta.id} value={ta.id} sx={{ fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                            {ta.discordGlobalName || ta.discordUserName || ta.name || ta.email}
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>
                  ))}
                </Box>
              </DialogContent>
              <DialogActions sx={{ px: 3.5, pb: 3, pt: 2, gap: 1 }}>
                <MuiButton
                  onClick={() => setShowAssignModal(false)}
                  sx={{ color: '#71717a', textTransform: 'none', fontWeight: 500, fontSize: '0.85rem', '&:hover': { color: '#d4d4d8', bgcolor: 'rgba(255,255,255,0.04)' } }}
                >
                  Skip
                </MuiButton>
                <MuiButton
                  onClick={handleBatchTAAssign}
                  variant="contained"
                  disabled={Object.values(taAssignments).every((v) => v === '')}
                  sx={{
                    bgcolor: '#f97316', '&:hover': { bgcolor: '#ea580c' },
                    textTransform: 'none', fontWeight: 600, fontSize: '0.85rem',
                    boxShadow: 'none', borderRadius: 2, px: 3,
                    '&.Mui-disabled': { bgcolor: 'rgba(249,115,22,0.2)', color: 'rgba(249,115,22,0.4)' },
                  }}
                >
                  Assign TAs
                </MuiButton>
              </DialogActions>
            </>
          )}

          {/* Assigning TAs loading */}
          {assignStep === 'assigning-ta' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
              <CircularProgress size={32} sx={{ color: '#f97316' }} />
              <Typography sx={{ color: '#71717a', fontSize: '0.9rem' }}>Assigning TAs...</Typography>
            </Box>
          )}
        </Dialog>

        {/* Snackbar for success/error popups */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        <TableContextMenu
          contextMenu={contextMenu}
          onClose={() => setContextMenu({ visible: false, x: 0, y: 0, targetId: null })}
          onDelete={handleDeleteStudent}
        />

      </Box>
    </Box>
  );
};

export default TableView;
