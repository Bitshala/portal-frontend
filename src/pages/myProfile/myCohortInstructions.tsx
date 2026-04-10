import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCohort, useSyncCohortQuestions } from '../../hooks/cohortHooks';
import { useUser } from '../../hooks/userHooks';
import { UserRole } from '../../types/enums';
import InstructionsLayout from '../../components/instructions/InstructionsLayout';
import { lnWeeks } from '../../data/lnWeeks';
import { lbtclWeeks } from '../../data/lbtclWeeks';
import { mbWeeks } from '../../data/mbWeeks';
import { bpdWeeks } from '../../data/bpdWeeks';
import type { GetCohortWeekResponseDto, CohortWeekQuestion } from '../../types/api';
import type { RichQuestion } from '../../types/instructions';
import apiService from '../../services/apiService';

const cohortTypeToContent = {
  MASTERING_BITCOIN: { name: 'MB', weeks: mbWeeks },
  LEARNING_BITCOIN_FROM_COMMAND_LINE: { name: 'LBTCL', weeks: lbtclWeeks },
  MASTERING_LIGHTNING_NETWORK: { name: 'LN', weeks: lnWeeks },
  BITCOIN_PROTOCOL_DEVELOPMENT: { name: 'BPD', weeks: bpdWeeks },
} as const;

const MyCohortInstructions: React.FC = () => {
  const { cohortId } = useParams<{ cohortId: string }>();
  const navigate = useNavigate();
  const [activeWeek, setActiveWeek] = useState<number | 'links' | 'exercises'>(1);

  const { data: cohortData, isLoading: isLoadingCohort } = useCohort(cohortId);
  const { data: userData, isLoading: isLoadingUser } = useUser();
  const { mutate: syncQuestions } = useSyncCohortQuestions();

  const isAdminOrTA = userData?.role === UserRole.ADMIN || userData?.role === UserRole.TEACHING_ASSISTANT;

  useEffect(() => {
    if (isAdminOrTA && cohortId) {
      syncQuestions({ cohortId });
    }
  }, [cohortId, isAdminOrTA]);

  const isLoading = isLoadingCohort || isLoadingUser;

  const content = cohortData
    ? cohortTypeToContent[cohortData.type as keyof typeof cohortTypeToContent]
    : undefined;

  const toRichQuestions = (cohortId: string, questions: CohortWeekQuestion[]): (string | RichQuestion)[] =>
    questions.map((q) =>
      q.attachments.length > 0
        ? {
            text: q.text,
            attachments: q.attachments.map((filename) => ({
              filename,
              url: apiService.getAttachmentUrl(cohortId, filename),
            })),
          }
        : q.text,
    );

  // useMemo must be called unconditionally before any early returns
  const mergedWeeklyContent = useMemo(() => {
    if (!content || !cohortData) return [];
    const apiWeeks = cohortData.weeks;
    if (!apiWeeks || apiWeeks.length === 0) return content.weeks;

    return content.weeks.map((staticWeek) => {
      const apiWeek = apiWeeks.find((w: GetCohortWeekResponseDto) => w.week === staticWeek.week);
      if (!apiWeek) return staticWeek;

      return {
        ...staticWeek,
        gdQuestions: apiWeek.questions.length > 0 ? toRichQuestions(cohortData.id, apiWeek.questions) : staticWeek.gdQuestions,
        bonusQuestions: apiWeek.bonusQuestion.length > 0 ? toRichQuestions(cohortData.id, apiWeek.bonusQuestion) : staticWeek.bonusQuestions,
        classroomUrl: apiWeek.classroomUrl,
        classroomInviteLink: apiWeek.classroomInviteLink,
      };
    });
  }, [content, cohortData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  if (!cohortData || !cohortId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4 py-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <h1 className="text-2xl font-bold text-white">Cohort Not Found</h1>
            <button
              onClick={() => navigate('/me')}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4 py-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <h1 className="text-2xl font-bold text-white">Instructions not available for this cohort type</h1>
            <button
              onClick={() => navigate('/me')}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <InstructionsLayout
      cohortName={content.name}
      cohortType={cohortData.type as 'MASTERING_BITCOIN' | 'LEARNING_BITCOIN_FROM_COMMAND_LINE' | 'MASTERING_LIGHTNING_NETWORK' | 'BITCOIN_PROTOCOL_DEVELOPMENT'}
      weeklyContent={mergedWeeklyContent}
      activeWeek={activeWeek}
      setActiveWeek={setActiveWeek}
      canViewBonusQuestions={isAdminOrTA}
      seasonNumber={cohortData.season}
    />
  );
};

export default MyCohortInstructions;
