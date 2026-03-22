import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCohorts, useCreateCohort, useUpdateCohort } from '../../hooks/cohortHooks';
import { CohortType } from '../../types/enums';
import type { GetCohortResponseDto } from '../../types/api';
import CohortCardV2 from '../../components/dashboard/CohortCardV2';
import { getCohortImage, COHORT_TYPES } from '../../utils/cohortUtils';
import { cohortTypeToName } from '../../helpers/cohortHelpers';
import { getTodayDate, calculateRegistrationDeadline, formatDateForInput } from '../../utils/dateUtils';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: cohortsData, isLoading, refetch } = useCohorts({ page: 0, pageSize: 100 });
  const createCohortMutation = useCreateCohort();
  const updateCohortMutation = useUpdateCohort();

  const [selectedCohortType, setSelectedCohortType] = useState<CohortType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<GetCohortResponseDto | null>(null);

  // Form state
  const [startDate, setStartDate] = useState<string>('');
  const [registrationDeadline, setRegistrationDeadline] = useState<string>('');

  const [popup, setPopup] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });


  // Auto-calculate registration deadline in create mode
  useEffect(() => {
    if (startDate && !isEditMode) {
      setRegistrationDeadline(calculateRegistrationDeadline(startDate));
    }
  }, [startDate, isEditMode]);

  const handleCardClick = (cohortType: CohortType) => {
    setSelectedCohortType(cohortType);

    // Find existing cohort for this type
    const existingCohort = cohortsData?.records?.find(
      (cohort) => cohort.type === cohortType
    );

    // Check if cohort is completed
    const isCohortCompleted = existingCohort && new Date() > new Date(existingCohort.endDate);

    if (existingCohort && !isCohortCompleted) {
      // Edit mode - only for active or upcoming cohorts
      setIsEditMode(true);
      setSelectedCohort(existingCohort);
      setStartDate(formatDateForInput(existingCohort.startDate));
      setRegistrationDeadline(formatDateForInput(existingCohort.registrationDeadline));
    } else {
      // Create mode - for new cohorts or completed cohorts (next season)
      setIsEditMode(false);
      setSelectedCohort(null);
      setStartDate(getTodayDate());
      setRegistrationDeadline('');
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCohortType(null);
    setSelectedCohort(null);
    setStartDate('');
    setRegistrationDeadline('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCohortType) return;

    if (!startDate || !registrationDeadline) {
      setPopup({
        show: true,
        message: 'Please fill in all required fields',
        type: 'error',
      });
      return;
    }

    try {
      if (isEditMode && selectedCohort) {
        // Update existing cohort
        await updateCohortMutation.mutateAsync({
          cohortId: selectedCohort.id,
          body: {
            startDate,
            registrationDeadline,
          },
        });
        // Refetch to ensure we have the latest data
        await refetch();
        setPopup({
          show: true,
          message: 'Cohort updated successfully!',
          type: 'success',
        });
      } else {
        // Create new cohort
        await createCohortMutation.mutateAsync({
          type: selectedCohortType,
          startDate,
          registrationDeadline,
        });
        // Refetch to ensure we have the latest data
        await refetch();
        setPopup({
          show: true,
          message: 'Cohort created successfully!',
          type: 'success',
        });
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save cohort:', error);
      let errorMessage = 'Failed to save cohort. Please try again.';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const responseError = error as { response?: { data?: { message?: string } } };
        if (responseError.response?.data?.message) {
          errorMessage = responseError.response.data.message;
        }
      }
      setPopup({
        show: true,
        message: errorMessage,
        type: 'error',
      });
    }
  };

  const closePopup = () => {
    setPopup({ show: false, message: '', type: 'success' });
  };

  const getCohortStatus = (cohortType: CohortType): string => {
    const cohort = cohortsData?.records?.find((c) => c.type === cohortType);
    if (!cohort) return 'Create Cohort';

    const now = new Date();
    const startDate = new Date(cohort.startDate);
    const endDate = new Date(cohort.endDate);

    if (now < startDate) return 'Upcoming';
    if (now > endDate) return 'Create Cohort';
    return 'Active';
  };

  const getNextSeason = (cohortType: CohortType): number => {
    const cohortsOfType = cohortsData?.records?.filter(
      (cohort) => cohort.type === cohortType
    ) || [];
    const maxSeason = cohortsOfType.length > 0
      ? Math.max(...cohortsOfType.map((c) => c.season))
      : 0;
    return maxSeason + 1;
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 px-4 md:px-8 py-6 relative" style={{ fontFamily: 'Sora, sans-serif' }}>
      {/* Top-right actions */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <button
          onClick={() => navigate('/admin/feedback')}
          className="b-0 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2 text-sm text-zinc-300"
          title="View Feedback"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="hidden md:inline">Feedback</span>
        </button>
        <button
          onClick={() => navigate('/select')}
          className="b-0 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          title="Score & Manage Cohorts"
        >
          <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl md:text-4xl font-bold">Admin Panel</h1>
        <p className="text-zinc-400 mt-1 text-sm md:text-base">Create and manage cohort</p>
      </header>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-base md:text-3xl font-medium md:font-bold mb-4 lowercase md:normal-case">cohort management</h2>
          {isLoading ? (
            <div className="text-zinc-400">Loading cohorts...</div>
          ) : (
            <>
              {/* Mobile List View */}
              <div className="flex flex-col gap-3 md:hidden">
                {COHORT_TYPES.map((cohortType) => {
                  const status = getCohortStatus(cohortType);
                  const existingCohort = cohortsData?.records?.find((c) => c.type === cohortType);
                  const isCompleted = existingCohort && new Date() > new Date(existingCohort.endDate);
                  const displaySeason = isCompleted ? getNextSeason(cohortType) : existingCohort?.season;

                  return (
                    <CohortCardV2
                      key={cohortType}
                      cohortType={cohortType}
                      cohortDisplayName={cohortTypeToName(cohortType)}
                      imageUrl={getCohortImage(cohortType)}
                      status={status}
                      season={displaySeason}
                      variant="mobile"
                      onClick={() => handleCardClick(cohortType)}
                    />
                  );
                })}
              </div>

              {/* Desktop Grid View */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {COHORT_TYPES.map((cohortType) => {
                  const status = getCohortStatus(cohortType);
                  const existingCohort = cohortsData?.records?.find((c) => c.type === cohortType);
                  const isCompleted = existingCohort && new Date() > new Date(existingCohort.endDate);
                  const displaySeason = isCompleted ? getNextSeason(cohortType) : existingCohort?.season;

                  return (
                    <CohortCardV2
                      key={cohortType}
                      cohortType={cohortType}
                      cohortDisplayName={cohortTypeToName(cohortType)}
                      imageUrl={getCohortImage(cohortType)}
                      status={status}
                      season={displaySeason}
                      variant="desktop"
                      onClick={() => handleCardClick(cohortType)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedCohortType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
          <div className="bg-zinc-800 rounded-3xl shadow-2xl p-6 md:p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
                {isEditMode ? 'Edit Cohort' : 'Create Cohort'}
              </h2>
              <button
                onClick={closeModal}
                className="b-0 bg-transparent text-zinc-400 hover:text-zinc-100 transition-colors -mt-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Description */}
            <p className="text-zinc-400 text-sm mb-8">
              {isEditMode
                ? `Update the details for ${cohortTypeToName(selectedCohortType)} cohort.`
                : `Please fill out the information below to create a new ${cohortTypeToName(selectedCohortType)} cohort.`
              }
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-300">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={getTodayDate()}
                  className="w-78 md:w-68 b-0 bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent transition-all"
                  style={{ colorScheme: 'dark' }}
                  required
                />
              </div>

              {/* Registration Deadline */}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-300">
                  Registration Deadline
                </label>
                <input
                  type="date"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  className="w-78 md:w-68 b-0 bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent transition-all"
                  style={{ colorScheme: 'dark' }}
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="b-0 bg-transparent hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-lg border border-zinc-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCohortMutation.isPending || updateCohortMutation.isPending}
                  className="b-0 bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createCohortMutation.isPending || updateCohortMutation.isPending
                    ? 'Saving...'
                    : isEditMode
                    ? 'Update'
                    : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup Modal */}
      {popup.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-zinc-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="flex flex-col items-center text-center">
              {popup.type === 'success' ? (
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <h3 className="text-2xl font-bold text-zinc-100 mb-2">
                {popup.type === 'success' ? 'Success!' : 'Error'}
              </h3>
              <p className="text-zinc-300 mb-6">{popup.message}</p>
              <button
                onClick={closePopup}
                className="border-none bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
