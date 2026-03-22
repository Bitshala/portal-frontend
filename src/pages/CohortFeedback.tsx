import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMyCohorts } from '../hooks/cohortHooks';
import { useSubmitFeedback } from '../hooks/feedbackHooks';
import { extractErrorMessage } from '../utils/errorUtils';
import NotificationModal from '../components/NotificationModal';
import CohortFeedbackForm from '../components/CohortFeedbackForm';
import type { NotificationState, FeedbackFormData } from '../types/feedback';

const CohortFeedback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedCohortId = searchParams.get('cohortId') || '';
    const { data: cohortsData, isLoading } = useMyCohorts({ page: 0, pageSize: 100 });
    const submitFeedbackMutation = useSubmitFeedback();

    const [notification, setNotification] = useState<NotificationState>({
        show: false,
        message: '',
        type: 'success',
    });

    const handleSubmit = async (data: FeedbackFormData) => {
        if (!data.cohortId) {
            setNotification({ show: true, message: 'Please select a cohort', type: 'error' });
            throw new Error('Cohort not selected');
        }

        try {
            await submitFeedbackMutation.mutateAsync({
                cohortId: data.cohortId,
                body: {
                    componentRatings: Object.keys(data.componentRatings).length > 0 ? data.componentRatings : undefined,
                    expectations: data.expectations || undefined,
                    improvements: data.improvements || undefined,
                    opportunityInterests: data.opportunityInterests.length > 0 ? data.opportunityInterests : undefined,
                    fellowshipInterests: data.fellowshipInterests.length > 0 ? data.fellowshipInterests : undefined,
                    idealProject: data.idealProject || undefined,
                    testimonial: data.testimonial || undefined,
                },
            });

            setNotification({ show: true, message: 'Feedback submitted successfully!', type: 'success' });
        } catch (error) {
            setNotification({ show: true, message: extractErrorMessage(error), type: 'error' });
            throw error;
        }
    };

    const closeNotification = () => {
        setNotification({ show: false, message: '', type: 'success' });
    };

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: '#000', fontFamily: 'Sora, sans-serif' }}
        >
            <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8" style={{ maxWidth: 900, margin: '0 auto' }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/myDashboard')}
                            className="bg-transparent border-0 cursor-pointer p-1 transition-colors duration-200"
                            style={{ color: '#71717a' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#fafafa')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#71717a')}
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h1
                            className="text-2xl sm:text-3xl font-bold"
                            style={{ color: '#fafafa' }}
                        >
                            Cohort Feedback
                        </h1>
                    </div>
                    <div
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden"
                        style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                        onClick={() => navigate('/me')}
                    >
                        <img
                            src="https://api.dicebear.com/9.x/adventurer/svg?seed=O"
                            className="w-full h-full rounded-full"
                            alt="avatar"
                        />
                    </div>
                </div>
                <p className="mb-6" style={{ color: '#71717a', fontSize: '0.9rem' }}>
                    Help us improve by sharing your thoughts about your cohort experience.
                </p>

                {/* Form */}
                <CohortFeedbackForm
                    cohorts={cohortsData?.records || []}
                    isLoading={isLoading}
                    onSubmit={handleSubmit}
                    preselectedCohortId={preselectedCohortId}
                />
            </div>

            <NotificationModal
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={closeNotification}
            />
        </div>
    );
};

export default CohortFeedback;
