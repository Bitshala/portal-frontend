import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCohort } from '../../hooks/cohortHooks';
import { useUser } from '../../hooks/userHooks';
import { UserRole } from '../../types/enums';
import { toRenderWeeks } from '../../helpers/cohortHelpers';
import InstructionsLayout from '../../components/instructions/InstructionsLayout';

const MyCohortInstructions: React.FC = () => {
  const { cohortId } = useParams<{ cohortId: string }>();
  const navigate = useNavigate();
  const [activeWeek, setActiveWeek] = useState<number | 'links' | 'exercises'>(1);

  const { data: cohortData, isLoading: isLoadingCohort } = useCohort(cohortId);
  const { data: userData, isLoading: isLoadingUser } = useUser();

  const isAdminOrTA = userData?.role === UserRole.ADMIN || userData?.role === UserRole.TEACHING_ASSISTANT;

  const isLoading = isLoadingCohort || isLoadingUser;

  const weeks = useMemo(() => (cohortData ? toRenderWeeks(cohortData) : []), [cohortData]);

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

  return (
    <InstructionsLayout
      displayName={cohortData.displayName}
      links={cohortData.links}
      weeks={weeks}
      activeWeek={activeWeek}
      setActiveWeek={setActiveWeek}
      cohortId={cohortId}
      canPresent={isAdminOrTA}
    />
  );
};

export default MyCohortInstructions;
