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
            style={{ backgroundColor: '#111', fontFamily: 'Sora, sans-serif' }}
        >
            <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8" style={{ maxWidth: 820, margin: '0 auto' }}>
                {/* Top bar */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/myDashboard')}
                            className="bg-transparent border-0 cursor-pointer p-1 transition-colors duration-200"
                            style={{ color: '#888' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#888')}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <span
                            className="text-xs font-semibold tracking-[0.2em] uppercase"
                            style={{ color: '#ccc' }}
                        >
                            Cohort Feedback
                        </span>
                    </div>
                    <div
                        className="h-9 w-9 rounded-full flex items-center justify-center cursor-pointer overflow-hidden"
                        style={{ border: '1px solid #333' }}
                        onClick={() => navigate('/me')}
                    >
                        <img
                            src="https://api.dicebear.com/9.x/adventurer/svg?seed=O"
                            className="w-full h-full rounded-full"
                            alt="avatar"
                        />
                    </div>
                </div>

                {/* Hero */}
                <h1
                    className="text-4xl sm:text-5xl font-bold mb-3"
                    style={{ color: '#fff', lineHeight: 1.1 }}
                >
                    Protocol Insights.
                </h1>
                <p className="mb-16" style={{ color: '#777', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 480 }}>
                    Help us refine the Bitshala learning experience. Your feedback directly shapes the next iteration of Bitcoin protocol education.
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
