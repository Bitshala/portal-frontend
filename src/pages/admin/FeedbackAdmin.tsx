import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllFeedback, useFeedbackByCohort } from '../../hooks/feedbackHooks';
import { useCohorts } from '../../hooks/cohortHooks';
import type { GetFeedbackResponseDto } from '../../types/api';
import {
  CohortComponent,
  ComponentRating,
} from '../../types/enums';

const COMPONENT_LABELS: Record<CohortComponent, string> = {
  [CohortComponent.SESSION_INSTRUCTIONS]: 'Session Instructions',
  [CohortComponent.STUDY_MATERIAL]: 'Study Material',
  [CohortComponent.GROUP_DISCUSSIONS]: 'Group Discussions',
  [CohortComponent.LOUNGE_DISCUSSIONS]: 'Lounge Discussions',
  [CohortComponent.DEPUTY]: 'TA',
  [CohortComponent.TEACHING_ASSISTANTS]: 'Teaching Assistants',
  [CohortComponent.BITSHALA_CLUBS]: 'Bitshala Clubs',
  [CohortComponent.BITDEV_MEETUPS]: 'Bitdev Meetups',
  [CohortComponent.BITSPACE]: 'Bitspace',
  [CohortComponent.FELLOWSHIPS]: 'Fellowships',
};

const RATING_LABELS: Record<ComponentRating, string> = {
  [ComponentRating.NOT_AT_ALL]: 'Not at all',
  [ComponentRating.SOMEWHAT]: 'Somewhat',
  [ComponentRating.HELPFUL]: 'Helpful',
  [ComponentRating.VERY_HELPFUL]: 'Very Helpful',
};

const RATING_COLOR: Record<ComponentRating, string> = {
  [ComponentRating.NOT_AT_ALL]: 'text-red-400',
  [ComponentRating.SOMEWHAT]: 'text-yellow-400',
  [ComponentRating.HELPFUL]: 'text-blue-400',
  [ComponentRating.VERY_HELPFUL]: 'text-green-400',
};

const PAGE_SIZE = 20;

const FeedbackDetailModal = ({
  feedback,
  onClose,
}: {
  feedback: GetFeedbackResponseDto;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
    <div className="bg-zinc-800 rounded-3xl shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">{feedback.userName ?? feedback.userEmail ?? 'Anonymous'}</h2>
          <p className="text-zinc-400 text-sm mt-0.5">{feedback.userEmail}</p>
        </div>
        <button onClick={onClose} className="b-0 bg-transparent text-zinc-400 hover:text-zinc-100 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-6 text-sm">
        {/* Component Ratings */}
        {feedback.componentRatings && Object.keys(feedback.componentRatings).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">Component Ratings</h3>
            <div className="space-y-2">
              {(Object.entries(feedback.componentRatings) as [CohortComponent, ComponentRating][]).map(([comp, rating]) => (
                <div key={comp} className="flex justify-between items-center py-1.5 border-b border-zinc-700/50">
                  <span className="text-zinc-300">{COMPONENT_LABELS[comp] ?? comp}</span>
                  <span className={`font-medium ${RATING_COLOR[rating] ?? 'text-zinc-300'}`}>
                    {RATING_LABELS[rating] ?? rating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text fields */}
        {[
          { label: 'Expectations', value: feedback.expectations },
          { label: 'Improvements', value: feedback.improvements },
          { label: 'Ideal Project', value: feedback.idealProject },
          { label: 'Testimonial', value: feedback.testimonial },
        ].map(({ label, value }) =>
          value ? (
            <div key={label}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">{label}</h3>
              <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{value}</p>
            </div>
          ) : null
        )}

        {/* Opportunity Interests */}
        {feedback.opportunityInterests.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Opportunity Interests</h3>
            <div className="flex flex-wrap gap-2">
              {feedback.opportunityInterests.map(item => (
                <span key={item} className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-300 text-xs">
                  {item.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fellowship Interests */}
        {feedback.fellowshipInterests.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Fellowship Interests</h3>
            <div className="flex flex-wrap gap-2">
              {feedback.fellowshipInterests.map(item => (
                <span key={item} className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-orange-300 text-xs">
                  {item.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-zinc-600 text-xs pt-2">
          Submitted {new Date(feedback.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  </div>
);

const FeedbackCard = ({ feedback, onClick }: { feedback: GetFeedbackResponseDto; onClick: () => void }) => {
  const ratingCount = feedback.componentRatings ? Object.keys(feedback.componentRatings).length : 0;
  const hasText = feedback.expectations || feedback.improvements || feedback.testimonial || feedback.idealProject;

  return (
    <button
      onClick={onClick}
      className="b-0 w-full text-left bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl p-5 transition-all duration-150 space-y-3"
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="font-semibold text-zinc-100">{feedback.userName ?? 'Unnamed'}</p>
          <p className="text-zinc-500 text-xs mt-0.5">{feedback.userEmail}</p>
        </div>
        <p className="text-zinc-600 text-xs shrink-0">
          {new Date(feedback.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {ratingCount > 0 && (
          <span className="px-2 py-0.5 bg-zinc-700/60 rounded-full text-zinc-300">
            {ratingCount} ratings
          </span>
        )}
        {feedback.opportunityInterests.length > 0 && (
          <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400">
            {feedback.opportunityInterests.length} opportunity interest{feedback.opportunityInterests.length > 1 ? 's' : ''}
          </span>
        )}
        {feedback.fellowshipInterests.length > 0 && (
          <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400">
            {feedback.fellowshipInterests.length} fellowship interest{feedback.fellowshipInterests.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {hasText && (
        <p className="text-zinc-400 text-sm line-clamp-2">
          {feedback.testimonial || feedback.expectations || feedback.improvements || feedback.idealProject}
        </p>
      )}
    </button>
  );
};

const AllFeedbackList = ({ selectedCohort }: { selectedCohort: string }) => {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<GetFeedbackResponseDto | null>(null);

  const allQuery = useAllFeedback(
    { page, pageSize: PAGE_SIZE },
    { enabled: !selectedCohort }
  );
  const cohortQuery = useFeedbackByCohort(
    { cohortId: selectedCohort, query: { page, pageSize: PAGE_SIZE } },
    { enabled: !!selectedCohort }
  );

  const { data, isLoading } = selectedCohort ? cohortQuery : allQuery;
  const records = data?.records ?? [];
  const total = data?.totalRecords ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (isLoading) {
    return <div className="text-zinc-400 text-sm py-8 text-center">Loading feedback...</div>;
  }

  if (records.length === 0) {
    return (
      <div className="text-zinc-500 text-sm py-12 text-center">
        No feedback submissions yet{selectedCohort ? ' for this cohort' : ''}.
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-zinc-400 text-sm">{total} submission{total !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {records.map(fb => (
          <FeedbackCard key={fb.id} feedback={fb} onClick={() => setSelected(fb)} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="b-0 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-100 rounded-lg text-sm transition-colors"
          >
            Previous
          </button>
          <span className="text-zinc-400 text-sm">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="b-0 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-100 rounded-lg text-sm transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {selected && <FeedbackDetailModal feedback={selected} onClose={() => setSelected(null)} />}
    </>
  );
};

const FeedbackAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { data: cohortsData } = useCohorts({ page: 0, pageSize: 100 });
  const [selectedCohort, setSelectedCohort] = useState('');

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 px-4 md:px-8 py-6" style={{ fontFamily: 'Sora, sans-serif' }}>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin')}
          className="b-0 bg-transparent text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">Feedback</h1>
          <p className="text-zinc-400 mt-1 text-sm">View all cohort feedback submissions</p>
        </div>
      </div>

      {/* Cohort filter */}
      <div className="mb-6 max-w-xs">
        <select
          value={selectedCohort}
          onChange={e => setSelectedCohort(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer text-sm"
        >
          <option value="" className="bg-zinc-900">All Cohorts</option>
          {cohortsData?.records.map(cohort => (
            <option key={cohort.id} value={cohort.id} className="bg-zinc-900">
              {cohort.type.replace(/_/g, ' ')} — Season {cohort.season}
            </option>
          ))}
        </select>
      </div>

      <AllFeedbackList selectedCohort={selectedCohort} />
    </div>
  );
};

export default FeedbackAdmin;
