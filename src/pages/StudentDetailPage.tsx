import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import { ArrowLeft, Calendar, BookOpen, Trophy } from 'lucide-react';

import { StudentSummary } from '../components/student/StudentSummary';
import { WeeklyProgressChart } from '../components/student/WeeklyProgressChart';
import { WeeklyBreakdownList } from '../components/student/WeeklyBreakdownCard';
import { ProfileDataCard } from '../components/student/ProfileDataCard';

import { useCohort } from '../hooks/cohortHooks';
import { useUserScores, useMyScores } from '../hooks/scoreHooks';
import { useUser, useUserById } from '../hooks/userHooks';
import { UserRole } from '../types/enums';
import { cohortHasExercises } from '../utils/calculations';

interface GroupDiscussionScores {
  id: string;
  attendance: boolean;
  communicationScore: number;
  maxCommunicationScore: number;
  depthOfAnswerScore: number;
  maxDepthOfAnswerScore: number;
  technicalBitcoinFluencyScore: number;
  maxTechnicalBitcoinFluencyScore: number;
  engagementScore: number;
  maxEngagementScore: number;
  isBonusAttempted: boolean;
  bonusAnswerScore: number;
  maxBonusAnswerScore: number;
  bonusFollowupScore: number;
  maxBonusFollowupScore: number;
  totalScore: number;
  maxTotalScore: number;
  groupNumber: number | null;
}

interface ExerciseScores {
  id: string;
  isSubmitted: boolean;
  isPassing: boolean;
  totalScore: number;
  maxTotalScore: number;
}

interface WeeklyScore {
  weekId: string;
  attended: boolean;
  groupDiscussionScores: GroupDiscussionScores;
  exerciseScores: ExerciseScores;
  attendanceScores?: { totalScore: number; maxTotalScore: number };
  totalScore: number;
  maxTotalScore: number;
}

interface Cohort {
  cohortId: string;
  cohortType: string;
  seasonNumber: number;
  weeklyScores: WeeklyScore[];
  totalScore: number;
  maxTotalScore: number;
}

interface ScoresData {
  cohorts: Cohort[];
  totalScore: number;
  maxTotalScore: number;
}

interface StudentInfo {
  name: string;
  email: string;
}

const StudentDetailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  const cohortIdParam = searchParams.get('cohortId');
  const cohortTypeParam = searchParams.get('cohortType');
  const studentId = searchParams.get('studentId');
  const fromSource = searchParams.get('from');

  const { data: cohortData } = useCohort(cohortIdParam);
  const { data: currentUser } = useUser();

  const isViewingOwnProfile = currentUser?.id === studentId;
  const canViewOtherScores = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.TEACHING_ASSISTANT;

  const { data: myScoresData } = useMyScores(undefined, { enabled: isViewingOwnProfile });
  const { data: userScoresData } = useUserScores(studentId || '', { enabled: !isViewingOwnProfile && canViewOtherScores && !!studentId });

  const scoresData: ScoresData | undefined = isViewingOwnProfile ? myScoresData : userScoresData;

  const { data: studentProfileData } = useUserById(studentId || '', { enabled: canViewOtherScores && !!studentId });

  // Set student info from URL params
  useState(() => {
    const studentName = searchParams.get('studentName');
    const studentEmail = searchParams.get('studentEmail');
    if (studentName || studentEmail) {
      setStudentInfo({
        name: studentName || 'Unknown',
        email: studentEmail || 'N/A',
      });
    }
  });

  const selectedCohort = scoresData?.cohorts.find(cohort => {
    if (cohortIdParam) return cohort.cohortId === cohortIdParam;
    if (cohortTypeParam) return cohort.cohortType === cohortTypeParam;
    return false;
  }) || scoresData?.cohorts[0];

  const sortedCohortWeeks = useMemo(() => {
    if (!cohortData?.weeks) return [];
    return [...cohortData.weeks].sort((a, b) => a.week - b.week);
  }, [cohortData?.weeks]);

  const weekIdToNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedCohortWeeks.forEach(week => map.set(week.id, week.week));
    return map;
  }, [sortedCohortWeeks]);

  const weekIdToTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    sortedCohortWeeks.forEach(week => map.set(week.id, week.type));
    return map;
  }, [sortedCohortWeeks]);

  const sortedWeeklyScores = useMemo(() => {
    if (!selectedCohort?.weeklyScores) return [];
    return [...selectedCohort.weeklyScores].sort((a, b) => {
      const weekNumA = weekIdToNumberMap.get(a.weekId) ?? 0;
      const weekNumB = weekIdToNumberMap.get(b.weekId) ?? 0;
      return weekNumA - weekNumB;
    });
  }, [selectedCohort?.weeklyScores, weekIdToNumberMap]);

  const totalWeeks = sortedWeeklyScores.length || 0;
  const attendedWeeks = sortedWeeklyScores.filter(w => w.attended ?? w.groupDiscussionScores?.attendance).length || 0;
  const hasExercises = cohortHasExercises(selectedCohort?.cohortType || '');

  const stats = {
    totalScore: selectedCohort?.totalScore || 0,
    maxPossibleScore: selectedCohort?.maxTotalScore || 0,
    avgScore: totalWeeks > 0 ? (selectedCohort?.totalScore || 0) / totalWeeks : 0,
    attendanceRate: totalWeeks > 0 ? (attendedWeeks / totalWeeks) * 100 : 0,
    overallPercentage: (selectedCohort?.maxTotalScore || 0) > 0 ? ((selectedCohort?.totalScore || 0) / (selectedCohort?.maxTotalScore || 0)) * 100 : 0,
    attendedWeeks,
    totalWeeks,
  };

  const validWeeks = sortedWeeklyScores
    .map((weekScore) => ({
      week: weekIdToNumberMap.get(weekScore.weekId) ?? 0,
      weekId: weekScore.weekId,
      weekType: weekIdToTypeMap.get(weekScore.weekId) ?? 'GROUP_DISCUSSION',
      totalScore: weekScore.totalScore,
      maxTotalScore: weekScore.maxTotalScore,
      groupDiscussionScores: weekScore.groupDiscussionScores,
      exerciseScores: weekScore.exerciseScores,
      attendance: weekScore.attended ?? weekScore.groupDiscussionScores?.attendance ?? false,
    }));

  const chartWeeklyData = sortedWeeklyScores.map((weekScore) => {
    const weekNumber = weekIdToNumberMap.get(weekScore.weekId) ?? 0;
    return {
      week: weekNumber,
      attendance: weekScore.attended ?? weekScore.groupDiscussionScores?.attendance ?? false,
      gdScore: {
        fa: weekScore.groupDiscussionScores?.communicationScore ?? 0,
        fb: weekScore.groupDiscussionScores?.depthOfAnswerScore ?? 0,
        fc: weekScore.groupDiscussionScores?.technicalBitcoinFluencyScore ?? 0,
        fd: weekScore.groupDiscussionScores?.engagementScore ?? 0,
      },
      bonusScore: {
        attempt: weekScore.groupDiscussionScores?.bonusAnswerScore ?? 0,
        good: weekScore.groupDiscussionScores?.bonusAnswerScore ?? 0,
        followUp: weekScore.groupDiscussionScores?.bonusFollowupScore ?? 0,
      },
      exerciseScore: {
        Submitted: weekScore.exerciseScores?.isSubmitted ?? false,
        privateTest: weekScore.exerciseScores?.isPassing ?? false,
      },
      total: weekScore.maxTotalScore > 0 ? weekScore.totalScore / weekScore.maxTotalScore : 0,
      totalScore: weekScore.totalScore,
      maxTotalScore: weekScore.maxTotalScore,
      group: weekScore.groupDiscussionScores?.groupNumber?.toString() || null,
      ta: 'TBD',
    };
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fafafa' }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2, sm: 3 } }}>

        {/* Back button */}
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          sx={{
            color: '#a1a1aa',
            textTransform: 'none',
            fontWeight: 500,
            mb: 2,
            px: 1.5,
            '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          Back
        </Button>

        {/* Header */}
        {studentInfo && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                  {studentInfo.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a1a1aa', mt: 0.5 }}>
                  {isViewingOwnProfile ? studentInfo.email : studentInfo.email}
                </Typography>
                {selectedCohort && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Chip
                      label={selectedCohort.cohortType.replace(/_/g, ' ')}
                      size="small"
                      sx={{ bgcolor: 'rgba(249,115,22,0.15)', color: '#fb923c', fontWeight: 600, fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={`Season ${selectedCohort.seasonNumber}`}
                      size="small"
                      sx={{ bgcolor: '#3f3f46', color: '#d4d4d8', fontWeight: 500, fontSize: '0.7rem' }}
                    />
                  </Box>
                )}
              </Box>

              {/* Action buttons */}
              {!fromSource && (
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {selectedCohort && (selectedCohort.cohortType === "MASTERING_BITCOIN" || selectedCohort.cohortType === "LEARNING_BITCOIN_FROM_COMMAND_LINE" || selectedCohort.cohortType === "MASTERING_LIGHTNING_NETWORK") && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<BookOpen size={16} />}
                      onClick={() => {
                        if (selectedCohort.cohortId) {
                          navigate(`/${selectedCohort.cohortId}/instructions`);
                        } else if (selectedCohort.cohortType === "MASTERING_BITCOIN") {
                          navigate('/mb-instructions');
                        } else if (selectedCohort.cohortType === "LEARNING_BITCOIN_FROM_COMMAND_LINE") {
                          navigate('/lbtcl-instructions');
                        } else if (selectedCohort.cohortType === "MASTERING_LIGHTNING_NETWORK") {
                          navigate('/ln-instructions');
                        }
                      }}
                      sx={{ bgcolor: '#ea580c', textTransform: 'none', fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: '#c2410c' } }}
                    >
                      Instructions
                    </Button>
                  )}
                  {cohortIdParam && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Trophy size={16} />}
                      onClick={() => navigate(`/results/${cohortIdParam}`)}
                      sx={{ color: '#fb923c', borderColor: 'rgba(249,115,22,0.4)', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#fb923c', bgcolor: 'rgba(249,115,22,0.08)' } }}
                    >
                      View Ranking
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Summary Stats */}
        <StudentSummary stats={stats} hasExercises={hasExercises} />

        {/* Progress Chart */}
        <Box sx={{ mb: 3 }}>
          <WeeklyProgressChart weeklyData={chartWeeklyData} />
        </Box>

        {/* Weekly Breakdown (hidden for admin/TA viewing other students) */}
        {validWeeks.length > 0 && (canViewOtherScores ? isViewingOwnProfile : true) && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Calendar size={20} color="#fafafa" />
              <Typography sx={{ fontWeight: 600, color: '#fafafa' }}>
                Weekly Breakdown
              </Typography>
            </Box>
            <WeeklyBreakdownList
              weeks={validWeeks}
              cohortType={selectedCohort?.cohortType}
            />
          </Box>
        )}

        {/* Profile Data (admin/TA only) */}
        {canViewOtherScores && studentProfileData && (
          <ProfileDataCard profile={studentProfileData} />
        )}
      </Box>
    </Box>
  );
};

export default StudentDetailPage;
