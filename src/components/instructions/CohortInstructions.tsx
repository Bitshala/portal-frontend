import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { useUser } from '../../hooks/userHooks';
import { useMyScores } from '../../hooks/scoreHooks';
import { useMyCohorts, useCohorts, useSyncCohortQuestions } from '../../hooks/cohortHooks';
import { UserRole } from '../../types/enums';
import InstructionsLayout from './InstructionsLayout';
import type { WeekContent, RichQuestion } from '../../types/instructions';
import type { GetCohortWeekResponseDto, CohortWeekQuestion } from '../../types/api';
import apiService from '../../services/apiService';

interface CohortInstructionsProps {
  cohortType: 'MASTERING_BITCOIN' | 'LEARNING_BITCOIN_FROM_COMMAND_LINE' | 'MASTERING_LIGHTNING_NETWORK' | 'BITCOIN_PROTOCOL_DEVELOPMENT';
  cohortName: string;
  weeklyContent: WeekContent[];
}

const CohortInstructions: React.FC<CohortInstructionsProps> = ({
  cohortType,
  cohortName,
  weeklyContent,
}) => {
  const navigate = useNavigate();
  const [activeWeek, setActiveWeek] = useState<number | 'links' | 'exercises'>(1);
  const [error, setError] = useState<string | null>(null);

  const { data: userData, isLoading: isLoadingUser } = useUser();
  const { data: scoresData, isLoading: isLoadingScores } = useMyScores();
  const { data: myCohortsData, isLoading: isLoadingCohorts } = useMyCohorts({ page: 0, pageSize: 100 });
  const { data: allCohortsData, isLoading: isLoadingAllCohorts } = useCohorts({ page: 0, pageSize: 100 });

  const isAdminOrTA = userData?.role === UserRole.ADMIN || userData?.role === UserRole.TEACHING_ASSISTANT;

  const hasAccess = isAdminOrTA || (scoresData?.cohorts.some(
    (record) => record.cohortType === cohortType
  ) ?? false);

  const canViewBonusQuestions = isAdminOrTA;

  const myCohort = myCohortsData?.records
    .filter((c) => c.type === cohortType)
    .sort((a, b) => b.season - a.season)[0];

  // For Admin/TA: use /cohorts, for Students: use /cohorts/me
  const apiCohort = isAdminOrTA
    ? allCohortsData?.records
        .filter((c) => c.type === cohortType)
        .sort((a, b) => b.season - a.season)[0]
    : myCohort;

  const seasonNumber = apiCohort?.season ?? myCohort?.season;

  const cohortId = apiCohort?.id;

  const { mutate: syncQuestions } = useSyncCohortQuestions();

  // Auto-sync questions from config on page load for admins/TAs
  useEffect(() => {
    if (isAdminOrTA && cohortId) {
      syncQuestions({ cohortId });
    }
  }, [cohortId, isAdminOrTA]);

  const toRichQuestions = React.useCallback(
    (questions: CohortWeekQuestion[]): (string | RichQuestion)[] =>
      questions.map((q) =>
        q.attachments.length > 0 && cohortId
          ? {
              text: q.text,
              attachments: q.attachments.map((filename) => ({
                filename,
                url: apiService.getAttachmentUrl(cohortId, filename),
              })),
            }
          : q.text,
      ),
    [cohortId],
  );

  // Merge API week data (questions, bonusQuestion, classroomUrl, classroomInviteLink) into static content
  const mergedWeeklyContent = React.useMemo(() => {
    const apiWeeks = apiCohort?.weeks;
    if (!apiWeeks || apiWeeks.length === 0) return weeklyContent;

    return weeklyContent.map((staticWeek) => {
      const apiWeek = apiWeeks.find((w: GetCohortWeekResponseDto) => w.week === staticWeek.week);
      if (!apiWeek) return staticWeek;

      return {
        ...staticWeek,
        gdQuestions: apiWeek.questions.length > 0 ? toRichQuestions(apiWeek.questions) : staticWeek.gdQuestions,
        bonusQuestions: apiWeek.bonusQuestion.length > 0 ? toRichQuestions(apiWeek.bonusQuestion) : staticWeek.bonusQuestions,
        classroomUrl: apiWeek.classroomUrl,
        classroomInviteLink: apiWeek.classroomInviteLink,
      };
    });
  }, [weeklyContent, apiCohort, toRichQuestions]);

  const isLoading = isLoadingUser || isLoadingScores || isLoadingCohorts || isLoadingAllCohorts;

  useEffect(() => {
    if (!isLoading && scoresData && !hasAccess) {
      setError(`You need to be enrolled in a ${cohortType.replace(/_/g, ' ')} cohort to access these instructions.`);
    }
  }, [isLoading, scoresData, hasAccess, cohortType]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#000' }}>
        <CircularProgress sx={{ color: '#f97316' }} />
      </Box>
    );
  }

  if (error || !hasAccess) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', px: 2, py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center', maxWidth: 480 }}>
          <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 3, bgcolor: 'rgba(239,68,68,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={32} color="#f87171" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fafafa', mb: 1.5 }}>
            Access Restricted
          </Typography>
          <Typography variant="body2" sx={{ color: '#a1a1aa', mb: 4, lineHeight: 1.6 }}>
            {error || `You need to be enrolled in a ${cohortType.replace(/_/g, ' ')} cohort to access these instructions.`}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => navigate('/me')}
              sx={{ bgcolor: '#ea580c', '&:hover': { bgcolor: '#c2410c' }, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
            >
              View Profile & Cohorts
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(-1 as any)}
              sx={{ color: '#d4d4d8', borderColor: '#52525b', textTransform: 'none', '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' } }}
            >
              Go Back
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <InstructionsLayout
      cohortName={cohortName}
      cohortType={cohortType}
      weeklyContent={mergedWeeklyContent}
      activeWeek={activeWeek}
      setActiveWeek={setActiveWeek}
      canViewBonusQuestions={canViewBonusQuestions}
      seasonNumber={seasonNumber}
    />
  );
};

export default CohortInstructions;
